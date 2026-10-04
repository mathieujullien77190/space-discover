// Terre : sphère texturée (mers bleues, terres vertes, glaciers) + traits vectoriels nets (trait de côte, frontières) tracés en 3D.
// Unité : 1 = rayon équatorial de la Terre (6378,137 km). Repère : x vers (lon 0, lat 0), y vers le nord, z vers 90° ouest (l'est tourne dans le sens direct autour de y).
const R_KM = FLIGHT_OBJECTS.earth.radiusKm, DEG = Math.PI / 180;   // rayon équatorial de la Terre : objects/earth/earth.json (js/data/objects.js doit être chargé avant)
const SEA = '#1f63a8';

// vecteur unitaire pour (longitude est °, latitude °)
function ll(lon, lat, out) {
  const lo = lon * DEG, la = lat * DEG, c = Math.cos(la);
  out = out || new THREE.Vector3(); return out.set(c * Math.cos(lo), Math.sin(la), -c * Math.sin(lo));
}

// ---------- texture à plat (équirectangulaire) ----------
function texPoly(g, pts, TW, TH, offs) {
  const X = lon => (lon + 180) / 360 * TW, Y = lat => (90 - lat) / 180 * TH;
  let lo = Infinity, hi = -Infinity; for (const p of pts) { if (p[0] < lo) lo = p[0]; if (p[0] > hi) hi = p[0]; }
  for (const off of offs) {
    if (hi + off < -180 || lo + off > 180) continue;
    pts.forEach((p, i) => { if (i === 0) g.moveTo(X(p[0] + off), Y(p[1])); else g.lineTo(X(p[0] + off), Y(p[1])); });
    g.closePath();
  }
}
// anneau : continu, ou qui passe l'antiméridien (longitudes dépliées, recopiées) ; un anneau qui fait le tour d'un pôle est fermé par ce pôle
function texRing(g, ring, TW, TH) {
  const n = ring.length; if (n < 3) return;
  const pts = [[ring[0][0], ring[0][1]]]; let jump = false, x = ring[0][0];
  for (let i = 1; i <= n; i++) {
    const q = ring[i % n], prev = ring[i - 1]; let dl = q[0] - prev[0];
    if (Math.abs(dl) > 180) { jump = true; dl += dl > 0 ? -360 : 360; }
    x += dl; if (i < n) pts.push([x, q[1]]);
  }
  const net = x - ring[0][0];
  if (!jump) { texPoly(g, pts, TW, TH, [0]); return; }
  if (Math.abs(net) > 180) { const pole = net > 0 ? -90 : 90; pts.push([pts[0][0] + net, pts[0][1]], [pts[0][0] + net, pole], [pts[0][0], pole]); }
  texPoly(g, pts, TW, TH, [-360, 0, 360]);
}
function paintEarthTexture(TW, TH) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const g = c.getContext('2d'); g.fillStyle = SEA; g.fillRect(0, 0, TW, TH);
  const rings = SURF_EARTH.parts.map(([cl, flat]) => {
    const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i] / 10, flat[i + 1] / 10]); return { cl, r };
  });
  SURF_EARTH.classes.forEach(([, color], cl) => {   // terres, puis glaciers, puis lacs
    g.fillStyle = cl === 0 ? '#4f9a45' : color; g.beginPath();
    for (const p of rings) if (p.cl === cl) texRing(g, p.r, TW, TH);
    g.fill('nonzero');
  });
  return c;
}

// sphère dont les sommets suivent exactement ll(lon, lat) et dont l'UV = (lon, lat) de la texture
function earthGeometry(nx, ny) {
  const geo = new THREE.SphereGeometry(1, nx, ny), uv = geo.attributes.uv, pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    ll(uv.getX(i) * 360 - 180, uv.getY(i) * 180 - 90, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- traits vectoriels : trait de côte et frontières ----------
function linesMesh(kinds, radius, color, opacity) {
  let nSeg = 0; for (const [k, f] of EARTH_BORDERS.lines) if (kinds.includes(k)) nSeg += f.length / 2 - 1;
  const pos = new Float32Array(nSeg * 6), v = new THREE.Vector3(); let o = 0;
  for (const [k, f] of EARTH_BORDERS.lines) {
    if (!kinds.includes(k)) continue;
    let px = 0, py = 0, pz = 0;
    for (let i = 0; i < f.length; i += 2) {
      ll(f[i] / 1000, f[i + 1] / 1000, v).multiplyScalar(radius);
      if (i > 0) { pos[o++] = px; pos[o++] = py; pos[o++] = pz; pos[o++] = v.x; pos[o++] = v.y; pos[o++] = v.z; }
      px = v.x; py = v.y; pz = v.z;
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  m.frustumCulled = false; return m;
}

function buildEarth(renderer) {
  const group = new THREE.Group();
  const maxTex = renderer.capabilities.maxTextureSize, TW = Math.min(8192, maxTex), TH = TW / 2;
  const tex = new THREE.CanvasTexture(paintEarthTexture(TW, TH));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const globe = new THREE.Mesh(earthGeometry(1024, 512), new THREE.MeshLambertMaterial({ map: tex }));
  group.add(globe);
  group.add(linesMesh([2], 1.00003, 0xffffff, 0.85));        // trait de côte : contour net mer / continent
  group.add(linesMesh([0], 1.00005, 0xfff3c4, 0.9));         // frontières
  group.add(linesMesh([1], 1.00005, 0xffa566, 0.9));         // frontières contestées
  return group;
}

// ---------- photos aériennes (images satellites) plaquées sur la Terre ----------
// Rustine = morceau de sphère limité à `bounds` [lonO, lonE, latS, latN] (°), coordonnées de texture = l'image (équirectangulaire), bords fondus. Chargée à la demande (fetch http : en file:// WebGL refuse l'image).
// Posée à PATCH_R, un souffle au-dessus de la sphère : le maillage de la Terre est toujours en dessous (ses sommets sont sur la sphère, ses facettes à l'intérieur) ; masquée au-delà de 700 km (la marge ne dépasse plus la précision de profondeur).
const PATCH_R = 1 + 2e-6;
const PHOTO_PATCHES = [
  { id: 'kourou', url: 'data/photo-kourou.jpg', bounds: [-53.0, -52.55, 5.05, 5.45], hideKm: 700, loadKm: 1500, order: 0,
    credit: 'Sentinel-2 cloudless 2016, EOxCloudless https://cloudless.eox.at par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées), CC BY 4.0 ; image 4096 × 3641 (~12 m/pixel)' },
  // haute résolution : le pas de tir d'Ariane 5 (ELA-3) et ses environs, 2,75 × 2,75 km ; posée par-dessus la précédente (même rayon, transparence, ordre de rendu : aucun scintillement de profondeur)
  { id: 'kourou-hi', url: 'data/photo-kourou-hi.jpg', bounds: [-52.7809, -52.7559, 5.2279, 5.2529], hideKm: 150, loadKm: 400, order: 1,
    credit: 'IGN Géoplateforme, ORTHO-SAT Pléiades 2013 (© CNES 2013, distribution Airbus DS) ; 4096 × 4096 (~0,7 m/pixel) ; licence à vérifier avant publication' },
  { id: 'canaveral', url: 'data/photo-canaveral.jpg', bounds: [-80.8291,-80.3791,28.4083,28.8083], hideKm: 700, loadKm: 1500, order: 0,
    credit: 'Sentinel-2 cloudless 2016, EOxCloudless https://cloudless.eox.at par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées), CC BY 4.0 ; 4096 × 3641 (~12 m/pixel)' },
  { id: 'canaveral-hi', url: 'data/photo-canaveral-hi.jpg', bounds: [-80.6173, -80.5923, 28.5965, 28.6215], hideKm: 150, loadKm: 400, order: 1,
    credit: 'USGS National Agriculture Imagery Program (NAIP), domaine public ; LC-39A, 4 quadrants de 2048 px assemblés (~0,7 m/pixel)' },
  { id: 'sriharikota', url: 'data/photo-sriharikota.jpg', bounds: [80.0054,80.4554,13.5199,13.9199], hideKm: 700, loadKm: 1500, order: 0,
    credit: 'Sentinel-2 cloudless 2016, EOxCloudless https://cloudless.eox.at par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées), CC BY 4.0 ; 4096 × 3641 (~12 m/pixel)' },
  { id: 'wenchang', url: 'data/photo-wenchang.jpg', bounds: [110.726,111.176,19.4145,19.8145], hideKm: 700, loadKm: 1500, order: 0,
    credit: 'Sentinel-2 cloudless 2016, EOxCloudless https://cloudless.eox.at par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées), CC BY 4.0 ; 4096 × 3641 (~12 m/pixel)' },
  { id: 'baikonour', url: 'data/photo-baikonour.jpg', bounds: [63.1172,63.5672,45.72,46.12], hideKm: 700, loadKm: 1500, order: 0,
    credit: 'Sentinel-2 cloudless 2016, EOxCloudless https://cloudless.eox.at par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées), CC BY 4.0 ; 4096 × 3641 (~12 m/pixel)' },
  { id: 'tanegashima', url: 'data/photo-tanegashima.jpg', bounds: [130.7439,131.1939,30.2009,30.6009], hideKm: 700, loadKm: 1500, order: 0,
    credit: 'Sentinel-2 cloudless 2016, EOxCloudless https://cloudless.eox.at par EOX IT Services GmbH (contient des données Copernicus Sentinel 2016 modifiées), CC BY 4.0 ; 4096 × 3641 (~12 m/pixel)' },
  { id: 'tanegashima-hi', url: 'data/photo-tanegashima-hi.jpg', bounds: [130.957031, 130.984497, 30.387092, 30.410782], hideKm: 150, loadKm: 400, order: 1,
    credit: '国土地理院 (GSI Japan), photographies aériennes « seamlessphoto » zoom 17, 100 tuiles assemblées (~1 m/pixel), conditions d\'utilisation du gouvernement japonais (compatibles CC BY 4.0) ; attribution : GSI Japan' },
];
function patchGeometry(b, nx, ny) {
  const [w, e, s, n] = b, pos = new Float32Array((nx + 1) * (ny + 1) * 3), nor = new Float32Array(pos.length), uv = new Float32Array((nx + 1) * (ny + 1) * 2), idx = [], v = new THREE.Vector3();
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i; ll(w + (e - w) * i / nx, n - (n - s) * j / ny, v);
    nor.set([v.x, v.y, v.z], 3 * k); pos.set([v.x * PATCH_R, v.y * PATCH_R, v.z * PATCH_R], 3 * k); uv.set([i / nx, 1 - j / ny], 2 * k);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b2 = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b2, b2, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
function loadPatch(p, renderer, parent) {
  if (p.state) return; p.state = 'loading';
  const img = new Image();
  img.onload = () => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = 'destination-out';   // bords fondus (5 %) : pas de rectangle net
      const f = Math.round(Math.min(w, h) * 0.05);
      for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, f, 0, 0, 0, f, h], [w, 0, w - f, 0, w - f, 0, f, h], [0, 0, 0, f, 0, 0, w, f], [0, h, 0, h - f, 0, h - f, w, f]]) {
        const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
      }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      p.mesh = new THREE.Mesh(patchGeometry(p.bounds, 96, 96), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false }));
      p.mesh.renderOrder = p.order || 0; p.mesh.visible = false; parent.add(p.mesh); p.state = 'ready';
    } catch (e) { p.state = 'error'; console.warn('Photo aérienne indisponible :', e.message); }
  };
  img.onerror = () => { p.state = 'error'; };
  img.src = p.url;
}
// libère la mémoire d'une photo quand on s'en éloigne (4096² RGBA ≈ 90 Mo de GPU avec ses mipmaps) ; elle se recharge (cache du navigateur) au retour
function unloadPatch(p, parent) {
  if (p.state !== 'ready' || !p.mesh) return;
  parent.remove(p.mesh); p.mesh.material.map.dispose(); p.mesh.material.dispose(); p.mesh.geometry.dispose(); p.mesh = null; p.state = null;
}
