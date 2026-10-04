// Globes en 3D avec three.js : TOUS les corps sphériques (Soleil, planètes, lunes) sont des sphères éclairées par le Soleil, plaquées d'une texture équirectangulaire
// rasterisée À PLAT (lon/lat vers x/y) : la projection 2D des polygones sur la sphère (js/globe-projection.js) a des cas dégénérés quand de très grandes côtes traversent
// l'horizon (clignotement) ; avec une texture sur une vraie sphère ce problème n'existe plus (le rasteriseur travaille en lon/lat, sans horizon).
// Un SEUL renderer/canevas WebGL (les contextes WebGL sont limités) rend le corps courant dans un canevas hors écran, recopié par drawImage dans le canevas 2D
// à l'endroit et au moment où le corps est dessiné (drawSphere) : l'ordre des calques (anneaux, lunes, étiquettes) est inchangé. Sans WebGL (ou sans three.js),
// ou si le rendu échoue pour un corps, l'ancien rendu 2D prend le relais pour ce corps.
//
// Texture d'un corps (paintGlobeTexture, testable sans WebGL avec un faux contexte 2D) :
//  - 'geo'     : corps à carte géologique (Terre, Mars, Lune, Io, Europe, Ganymède, Titan) : anneaux par classe (règle non nulle ; Mars sans trous : pièce par pièce dans l'ordre) ;
//  - 'craters' : corps à reliefs nommés sans carte (Mercure, Callisto, Rhéa…) : fond uni + cercles de cratères réels (ellipses en lon/lat) ;
//  - 'bands'   : géantes et Vénus : bandes de b.look.bands (y = sinus de la latitude), Grande Tache rouge de Jupiter, taches b.feat ;
//  - 'sun'     : Soleil (émissif, sans éclairage) : fond jaune + taches b.feat ; le dégradé de limbe est ajouté en 2D par drawSphere.
// Conventions d'écran : y vers le haut dans three (vers le bas en 2D), caméra orthographique vers −z, Soleil dans le plan de l'écran.
// Orientation : corps de SURFACES (b.surf) = celle de viewPt (centre (lon0, lat0) face à la caméra, puis roulis psi : globeOrientation, testée) ;
// autres corps = axe vertical, vue sur l'équateur, rotation b.spin (le point de longitude λ est vu à x = cos φ · sin(λ + spin) : centre de vue = −spin).

// Rotation du maillage : sphère canonique de three (u = (λ + 90°)/360°, voir texture.offset) -> vue centrée en (lat0, lon0), puis roulis psi.
// Même transformation que viewPt : p' = Rx(lat0) · Ry(−lon0) · p, puis rotation d'écran (horaire de psi vue de la caméra = Rz(−psi) en y vers le haut).
function globeOrientation(latDeg, lonDeg, psi, out) { const e = out || new THREE.Euler(); return e.set(latDeg * DEG, -lonDeg * DEG, -psi, 'ZXY'); }

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Peinture de la texture (aucune dépendance à WebGL : un contexte 2D, réel ou factice, suffit)
// ---------------------------------------------------------------------------------------------------------------------------------------------

// type de texture d'un corps
function globeTexKind(b) { return b.look.sun ? 'sun' : (b.surf && b.surf.geo) ? 'geo' : b.look.bands ? 'bands' : b.surf ? 'craters' : 'plain'; }

// taille de texture (largeur ; hauteur = moitié) : plus grande pour les cartes détaillées, petite pour les petits corps
function globeTexSize(b, maxTex) {
  const kind = globeTexKind(b);
  const w = b === EARTHB ? 5400 : b.id === 'lune' || b.id === 'mars' ? 4096
    : kind === 'geo' || kind === 'sun' || b.id === 'jupiter' || b.id === 'saturne' || (kind === 'craters' && b.R >= 1000) ? 2048 : 1024;
  return Math.min(w, maxTex || w);
}

// chemin d'un polygone (points [lon°, lat°] continus) dans la texture, recopié aux décalages `offs` (en degrés de longitude) qui touchent la texture
function texPoly(g, pts, TW, TH, offs) {
  const X = lon => (lon + 180) / 360 * TW, Y = lat => (90 - lat) / 180 * TH;
  let lo = Infinity, hi = -Infinity; for (const p of pts) { if (p[0] < lo) lo = p[0]; if (p[0] > hi) hi = p[0]; }
  for (const off of offs) {
    if (hi + off < -180 || lo + off > 180) continue;
    pts.forEach((p, i) => { if (i === 0) g.moveTo(X(p[0] + off), Y(p[1])); else g.lineTo(X(p[0] + off), Y(p[1])); });
    g.closePath();
  }
}
// anneau de la carte : continu (une copie), ou — s'il passe l'antiméridien — longitudes dépliées et recopiées ; un anneau qui fait le tour d'un pôle
// (rotation nette de ±360°) est fermé par ce pôle (extérieurs horaires : +360° = tour du pôle sud vers l'est, −360° = pôle nord)
function texRing(g, ring, TW, TH) {
  const n = ring.length; if (n < 3) return;
  const pts = [[ring[0][0], ring[0][1]]]; let jump = false, x = ring[0][0];
  for (let i = 1; i <= n; i++) {   // i = n : arête de fermeture
    const q = ring[i % n], prev = ring[i - 1]; let dl = q[0] - prev[0];
    if (Math.abs(dl) > 180) { jump = true; dl += dl > 0 ? -360 : 360; }
    x += dl; if (i < n) pts.push([x, q[1]]);
  }
  const net = x - ring[0][0];   // rotation nette sur l'anneau fermé : 0 normalement, ±360 s'il fait le tour d'un pôle
  if (!jump) { texPoly(g, pts, TW, TH, [0]); return; }
  if (Math.abs(net) > 180) { const pole = net > 0 ? -90 : 90; pts.push([pts[0][0] + net, pts[0][1]], [pts[0][0] + net, pole], [pts[0][0], pole]); }
  texPoly(g, pts, TW, TH, [-360, 0, 360]);
}
// petite ellipse (centre lon/lat en degrés ; demi-axes angulaires aLon le long du parallèle, aLat le long du méridien, en radians) : N points, longitudes continues
function texEllipse(g, TW, TH, lonDeg, latDeg, aLon, aLat, N) {
  const pts = [], cl = Math.max(0.2, Math.cos(latDeg * DEG));
  for (let i = 0; i < N; i++) { const th = 2 * Math.PI * i / N; pts.push([lonDeg + aLon * Math.cos(th) / cl / DEG, Math.max(-90, Math.min(90, latDeg + aLat * Math.sin(th) / DEG))]); }
  texPoly(g, pts, TW, TH, [-360, 0, 360]);
}
// cercle de rayon angulaire rho (rad) autour de (lon0, lat0) en degrés, vrai cercle de la sphère (une ellipse en lon/lat) ; ignoré s'il contient un pôle
function texCircle(g, TW, TH, lon0, lat0, rho, N) {
  if (Math.abs(lat0) + rho / DEG >= 89.5) return false;
  const p0 = lat0 * DEG, sp = Math.sin(p0), cp = Math.cos(p0), sr = Math.sin(rho), cr = Math.cos(rho), pts = [];
  for (let i = 0; i < N; i++) {
    const th = 2 * Math.PI * i / N, phi = Math.asin(Math.max(-1, Math.min(1, sp * cr + cp * sr * Math.cos(th))));
    pts.push([lon0 + Math.atan2(Math.sin(th) * sr * cp, cr - sp * Math.sin(phi)) / DEG, phi / DEG]);   // longitude continue : pas de saut hors des pôles
  }
  texPoly(g, pts, TW, TH, [-360, 0, 360]);
  return true;
}

// peint la texture du corps dans g (largeur TW, hauteur TH) ; retourne { kind, craters }
// ---------- photos géolocalisées plaquées sur un globe ----------
// Une photo (équirectangulaire : x = longitude, y = latitude, comme la texture) couvre le rectangle `bounds` = [lonO, lonE, latS, latN] (°) d'un corps ; elle est peinte PAR-DESSUS la carte de base.
// Données en data-URI dans js/lazy/photo-<id>.js (tools/make-photo.mjs), chargées à la demande. Pour ajouter une zone : un fichier + une ligne ici.
const GLOBE_PHOTOS = [{ id: 'terre-nasa', body: 'terre', bounds: [-180, 180, -90, 90], credit: 'NASA Visible Earth, Blue Marble Next Generation (relief + bathymétrie), 5400 × 2700' },
  { id: 'france-nasa', body: 'terre', bounds: [-5.5, 10, 41, 51.5], patch: true, credit: 'NASA GIBS, BlueMarble_ShadedRelief_Bathymetry, 500 m (3100 × 2100)' }];
const photoRect = (p, TW, TH) => { const [w, e, s, n] = p.bounds; return [(w + 180) / 360 * TW, (90 - n) / 180 * TH, (e - w) / 360 * TW, (n - s) / 180 * TH]; };   // x, y, largeur, hauteur dans la texture
const photoReady = p => p.img && p.img.complete && p.img.naturalWidth;
const photosOf = b => LAYERS.photos ? GLOBE_PHOTOS.filter(p => p.body === b.id && !p.patch && photoReady(p)) : [];   // photos peintes DANS la texture de base (zones grandes)
const patchesOf = b => LAYERS.photos ? GLOBE_PHOTOS.filter(p => p.body === b.id && p.patch && photoReady(p)) : [];   // zones à haute résolution : rustines 3D au-dessus du globe
// rustine : morceau de sphère limité à `bounds`, dont les coordonnées de texture couvrent exactement l'image (equirectangulaire). Même convention que le globe : λ = φ − 90° (texture.offset.x = 0,25), θ = 90° − latitude.
function photoPatchGeometry(bounds, nx = 96, ny = 64) { const [w, e, s, n] = bounds, D = DEG; return new THREE.SphereGeometry(1, nx, ny, (w + 90) * D, (e - w) * D, (90 - n) * D, (n - s) * D); }
// image rustine -> texture avec bords fondus (le raccord avec la carte de base ne fait pas de rectangle net)
function patchTexture(p) {
  const w = p.img.naturalWidth, h = p.img.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.drawImage(p.img, 0, 0, w, h); g.globalCompositeOperation = 'destination-out';
  const f = Math.round(Math.min(w, h) * 0.05);
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, f, 0, 0, 0, f, h], [w, 0, w - f, 0, w - f, 0, f, h], [0, 0, 0, f, 0, 0, w, f], [0, h, 0, h - f, 0, h - f, w, f]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, GLOBE_GL.renderer.capabilities.getMaxAnisotropy()); return tex;
}
function patchMesh(p) {
  if (!p.mesh) { p.mesh = new THREE.Mesh(photoPatchGeometry(p.bounds), new THREE.MeshLambertMaterial({ map: patchTexture(p), transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); p.mesh.scale.setScalar(1.0008); }   // un souffle au-dessus de la sphère
  return p.mesh;
}
// ---------- fond schématique : pays colorés (Terre) ----------
// Les contours simplifiés des pays (js/lazy/earth-countries.js, chargés à la demande) sont remplis de couleurs pastel (jamais la même couleur pour deux pays dont les boîtes se chevauchent, tant qu'il reste de la place), à la place du vert uniforme des terres ;
// glaciers et lacs de la carte vectorielle restent par-dessus. Contours grossiers (≈ 6 km) : sans importance à l'échelle de la texture (7 km/pixel) ; les frontières exactes sont tracées par-dessus au zoom (js/earth-borders.js).
const COUNTRY_PALETTE = ['#e9c9a0', '#c9dcae', '#f1e0a0', '#bfd5ea', '#e7bdcf', '#d3c8e8', '#b9e1d4', '#f0c8a4', '#d9d9a8', '#c4c9ec'];
const schematicOn = b => b === EARTHB && LAYERS.countryFill && typeof earthCountries !== 'undefined' && !!earthCountries;
let countryColors = null;
function countryColorList() {   // une couleur par pays : coloriage glouton, les grands pays d'abord
  if (countryColors && countryColors.src === earthCountries) return countryColors.list;
  const names = earthCountries.names, box = names.map(() => null), area = names.map(() => 0);
  for (const [ci, a, bb] of earthCountries.parts) { area[ci] += a; const o = box[ci]; box[ci] = o ? [Math.min(o[0], bb[0]), Math.max(o[1], bb[1]), Math.min(o[2], bb[2]), Math.max(o[3], bb[3])] : bb.slice(); }
  const order = names.map((_, i) => i).filter(i => box[i]).sort((a, b) => area[b] - area[a]), col = names.map(() => -1);
  const touch = (a, b) => box[a][0] <= box[b][1] && box[b][0] <= box[a][1] && box[a][2] <= box[b][3] && box[b][2] <= box[a][3];
  for (const i of order) { const used = new Set(); for (const j of order) if (col[j] >= 0 && j !== i && touch(i, j)) used.add(col[j]); let c = 0; while (c < COUNTRY_PALETTE.length && used.has(c)) c++; col[i] = c < COUNTRY_PALETTE.length ? c : i % COUNTRY_PALETTE.length; }
  countryColors = { src: earthCountries, list: col.map(c => COUNTRY_PALETTE[Math.max(0, c)]) }; return countryColors.list;
}
function paintCountryFills(g, TW, TH) {
  const cols = countryColorList(), parts = earthCountries.parts;
  for (let i = parts.length - 1; i >= 0; i--) {   // les grands d'abord, les petits (enclaves) par-dessus
    const [ci, , , flat] = parts[i], ring = []; for (let k = 0; k < flat.length; k += 2) ring.push([flat[k] / 100, flat[k + 1] / 100]);
    g.fillStyle = cols[ci]; g.beginPath(); texRing(g, ring, TW, TH); g.fill('nonzero');
  }
}
const photoKey = b => photosOf(b).map(p => p.id).join('+') + (schematicOn(b) ? '+pays' : '');
function requestPhotos(b) {
  if (b === EARTHB && LAYERS.countryFill && typeof requestEarthCountries === 'function') requestEarthCountries();   // contours des pays pour le fond schématique   // charge (une fois) les photos du corps : balise <script> (marche en file://) puis Image depuis la data-URI
  for (const p of GLOBE_PHOTOS) {
    if (p.body !== b.id || p.state) continue; p.state = 'loading';
    try {
      const sc = document.createElement('script'); sc.src = 'js/lazy/photo-' + p.id + '.js';
      sc.onload = () => { const uri = globalThis.GLOBE_PHOTO_DATA && GLOBE_PHOTO_DATA[p.id]; if (!uri) { p.state = 'error'; return; } const img = new Image(); img.onload = () => { p.img = img; p.state = 'ready'; }; img.onerror = () => { p.state = 'error'; }; img.src = uri; };
      sc.onerror = () => { p.state = 'error'; }; (document.head || document.body).appendChild(sc);
    } catch (e) { p.state = 'error'; }
  }
}
function paintGlobeTexture(g, b, TW, TH) {
  const L = b.look, S = b.surf, kind = globeTexKind(b), Yof = s => (90 - Math.asin(Math.max(-1, Math.min(1, s))) / DEG) / 180 * TH;
  g.fillStyle = b === EARTHB ? '#2a5ea6' : L.sun ? '#ffcf4d' : L.base; g.fillRect(0, 0, TW, TH);   // océan de la Terre, sinon couleur de fond du corps
  let craters = 0;
  if (kind === 'geo') {
    const geo = S.geo, fills = schematicOn(b);
    if (fills) paintCountryFills(g, TW, TH);   // pays colorés à la place des terres vertes
    if (geo.holes) {   // un seul tracé par classe, règle non nulle : les trous sont des anneaux de sens inverse
      geo.classes.forEach(([, color], ci) => {
        if (fills && ci === 0) return;   // la classe « terres » est remplacée par les pays
        g.fillStyle = color; g.beginPath(); let any = false;
        for (const p of S.parts) if (p.cls === ci) { texRing(g, p.ring, TW, TH); any = true; }
        if (any) g.fill('nonzero');
      });
    } else {   // sans trous (Mars) : un morceau à la fois, du plus grand au plus petit, les petits recouvrent
      for (const p of S.parts) { g.fillStyle = geo.classes[p.cls][1]; g.beginPath(); texRing(g, p.ring, TW, TH); g.fill('nonzero'); }
    }
    if (S.haze) { g.fillStyle = S.haze; g.fillRect(0, 0, TW, TH); }   // brume (Titan : on ne voit la surface qu'à travers)
  } else if (kind === 'craters') {
    g.lineWidth = Math.max(0.6, TW / 2048);
    for (const [, lon, lat, d, type] of S.names) {
      if (type !== 'c' || !(d > 0) || d / (2 * Math.PI * b.R) * TW < 1.5) continue;   // cratères de diamètre connu, d'au moins ~1,5 px de texture
      g.beginPath();
      if (!texCircle(g, TW, TH, lon, lat, d / 2 / b.R, 28)) continue;
      g.fillStyle = 'rgba(0,0,0,0.09)'; g.fill('nonzero'); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke(); craters++;
    }
  } else if (kind === 'bands') {
    for (const [col, s0, s1] of L.bands) { g.fillStyle = col; g.fillRect(0, Yof(s1), TW, Math.max(1, Yof(s0) - Yof(s1))); }   // bandes : y = sinus de la latitude
    if (L.grs) {   // Grande Tache rouge de Jupiter : lon 1 rad, lat −0,38 rad, 0,17 × 0,10 rayon
      g.fillStyle = '#b8503a'; g.beginPath(); texEllipse(g, TW, TH, 1.0 / DEG, -0.38 / DEG, 0.17, 0.1, 36); g.fill('nonzero');
    }
  }
  if (kind !== 'geo' && kind !== 'craters') {   // taches b.feat (Soleil, Neptune) : cercles d'angle f.s, longitudes en radians [0, 2π)
    for (const f of b.feat) {
      let lon = f.lon / DEG; if (lon > 180) lon -= 360;
      g.fillStyle = f.col; g.beginPath(); texEllipse(g, TW, TH, lon, f.lat / DEG, f.s, f.s, 24); g.fill('nonzero');
    }
  }
  for (const p of photosOf(b)) { const [x, y, w, h] = photoRect(p, TW, TH); g.drawImage(p.img, x, y, w, h); }   // photos géolocalisées par-dessus la carte
  return { kind, craters };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Cache des textures : on ne garde que ce qui est utile (budget mémoire, ancienneté)
// ---------------------------------------------------------------------------------------------------------------------------------------------
const GLOBE_BUDGET = 280e6;       // coût estimé total (octets : GPU avec mipmaps + canevas gardé en mémoire pour la restauration du contexte)
const GLOBE_IDLE_MS = 30000;      // une texture inutilisée depuis plus de 30 s est libérée
const GLOBE_SAFE_MS = 1000;       // ce qui a servi depuis moins d'une seconde n'est jamais libéré (corps visibles)
const globeCost = (TW, TH) => TW * TH * 4 * 2.33;

// libère (entry.dispose()) les entrées trop anciennes puis, si le budget est dépassé, les moins récentes ; ne touche pas aux entrées utilisées depuis GLOBE_SAFE_MS ; retourne les clés libérées
function globeCacheEvict(cache, now, budget, idleMs, safeMs) {
  const freed = []; let total = 0;
  for (const e of cache.values()) total += e.cost || 0;
  const old = [...cache.entries()].filter(([, e]) => e.cost && now - e.last > safeMs).sort((a, b) => a[1].last - b[1].last);
  for (const [k, e] of old) {
    if (now - e.last > idleMs || total > budget) { total -= e.cost; e.dispose(); cache.delete(k); freed.push(k); }
  }
  return freed;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Rendu WebGL partagé
// ---------------------------------------------------------------------------------------------------------------------------------------------
const GLOBE_GL = (() => {
  try {
    if (typeof THREE === 'undefined' || typeof WebGLRenderingContext === 'undefined') return null;
    const cv = document.createElement('canvas'); cv.width = cv.height = 2;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, premultipliedAlpha: true });
    renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
    const CAP = Math.min(2048, renderer.capabilities.maxTextureSize || 2048);
    renderer.setSize(CAP, CAP, false);
    const st = { ok: true, renderer, cv, CAP, maxTex: renderer.capabilities.maxTextureSize || 2048, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000),
      mesh: null, sun: null, cache: new Map(), euler: new THREE.Euler(), lastSweep: 0 };
    st.cam.position.z = 3000;
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); st.ok = false; });
    cv.addEventListener('webglcontextrestored', () => { st.ok = true; });   // three.js renvoie les textures (leur canevas est gardé) au prochain rendu
    st.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    st.sun = new THREE.DirectionalLight(0xffffff, Math.PI);
    st.scene.add(st.sun, st.sun.target);
    st.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshBasicMaterial());   // maillage unique ; le matériau change selon le corps
    st.scene.add(st.mesh);
    return st;
  } catch (e) { return null; }
})();

// texture + matériau d'un corps, créés à la première demande ; null si la création échoue (le corps retombe alors sur le rendu 2D)
function globeEntry(G, b, now) {
  requestPhotos(b);
  let e = G.cache.get(b.id);
  if (e && !e.failed && e.photoKey !== photoKey(b)) { e.dispose(); G.cache.delete(b.id); e = null; }   // une photo vient d'arriver, ou le calque a changé : on repeint
  if (e) { e.last = now; return e.failed ? null : e; }
  try {
    const TW = globeTexSize(b, G.maxTex), TH = TW / 2, c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const info = paintGlobeTexture(c.getContext('2d'), b, TW, TH);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.offset.x = 0.25;   // la sphère de three place λ = −90° au bord gauche de la texture ; la carte l'y place à −180° : décalage d'un quart de tour
    tex.anisotropy = Math.min(8, G.renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    const mat = b.look.sun ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
    e = { tex, mat, photoKey: photoKey(b), last: now, cost: globeCost(TW, TH), craters: info.craters > 0, kind: info.kind, dispose() { tex.dispose(); mat.dispose(); c.width = c.height = 1; } };
    G.cache.set(b.id, e);
    globeCacheEvict(G.cache, now, GLOBE_BUDGET, GLOBE_IDLE_MS, GLOBE_SAFE_MS);
    return e;
  } catch (err) { console.error('Globe 3D de ' + b.name + ' désactivé (retour au rendu 2D) :', err); G.cache.set(b.id, { failed: true, last: now, cost: 0, dispose() {} }); return null; }
}

// dessine le corps dans le canevas 2D, centré en (sx, sy) avec un rayon rpx (px CSS) ; retourne false si la 3D n'est pas disponible pour ce corps (le 2D prend le relais)
function drawGlobeGL(b, sx, sy, rpx, sunS) {
  const G = GLOBE_GL; if (!G || !G.ok || !LAYERS.globes3d || rpx > 3e4) return false;
  try { return renderGlobeGL(G, b, sx, sy, rpx, sunS); } catch (e) { G.ok = false; console.error('Globes 3D désactivés (retour au rendu 2D) :', e); return false; }
}
function renderGlobeGL(G, b, sx, sy, rpx, sunS) {
  const now = performance.now(), e = globeEntry(G, b, now); if (!e) return false;
  if (now - G.lastSweep > 5000) { G.lastSweep = now; globeCacheEvict(G.cache, now, GLOBE_BUDGET, GLOBE_IDLE_MS, GLOBE_SAFE_MS); }
  const dev = dpr, k = Math.min(1, (G.CAP - 6) / (2 * rpx * dev)), rr = rpx * k, sizeDev = Math.ceil((2 * rr + 6) * dev), half = sizeDev / (2 * dev), S = b.surf;
  const cam = G.cam; cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
  G.mesh.material = e.mat; G.mesh.scale.setScalar(rr);
  for (const ch of G.mesh.children.slice()) G.mesh.remove(ch);   // rustines de photos à haute résolution du corps
  for (const p of patchesOf(b)) G.mesh.add(patchMesh(p));
  G.mesh.rotation.copy(S ? globeOrientation(S.view.lat, S.view.lon, S.psi, G.euler) : globeOrientation(0, -b.spin / DEG, 0, G.euler));
  if (sunS) {
    let ux = sunS[0] - sx, uy = sunS[1] - sy; const d = Math.hypot(ux, uy) || 1;
    G.sun.position.set(ux / d * 1000, -uy / d * 1000, 0);   // le Soleil est dans le plan de l'écran, du côté où il se trouve
  }
  G.renderer.setViewport(0, 0, sizeDev, sizeDev); G.renderer.setScissor(0, 0, sizeDev, sizeDev); G.renderer.setScissorTest(true);
  G.renderer.render(G.scene, cam);
  const dest = sizeDev / dev / k;
  ctx.drawImage(G.cv, 0, G.CAP - sizeDev, sizeDev, sizeDev, sx - dest / 2, sy - dest / 2, dest, dest);
  if (S) S.glCraters = e.craters;   // les cratères sont déjà dans la texture : drawSurfaceLabels ne les redessine pas en cercles
  return true;
}
