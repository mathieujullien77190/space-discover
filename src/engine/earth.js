import { buildAtmosphere } from './atmosphere.js';
import { assetUrl } from './config.js';
import * as THREE from 'three';
import { wrapLighting } from './wrap-light.js';
import { EARTH_BORDERS } from './data/earth-borders.js';
import { FLIGHT_OBJECTS } from './data/objects.js';
import { SURF_EARTH } from './data/surface-earth.js';

// Terre : sphère texturée (mers bleues, terres vertes, glaciers) + traits vectoriels nets (trait de côte, frontières) tracés en 3D.
// Unité : 1 = rayon équatorial de la Terre (6378,137 km). Repère : x vers (lon 0, lat 0), y vers le nord, z vers 90° ouest (l'est tourne dans le sens direct autour de y).
export const R_KM = FLIGHT_OBJECTS.earth.radiusKm, DEG = Math.PI / 180;   // rayon équatorial de la Terre : objects/earth/earth.json (js/data/objects.js doit être chargé avant)
export const SEA = '#1f63a8';

// vecteur unitaire pour (longitude est °, latitude °)
export function ll(lon, lat, out) {
  const lo = lon * DEG, la = lat * DEG, c = Math.cos(la);
  out = out || new THREE.Vector3(); return out.set(c * Math.cos(lo), Math.sin(la), -c * Math.sin(lo));
}

// ---------- texture à plat (équirectangulaire) ----------
export function texPoly(g, pts, TW, TH, offs) {
  const X = lon => (lon + 180) / 360 * TW, Y = lat => (90 - lat) / 180 * TH;
  let lo = Infinity, hi = -Infinity; for (const p of pts) { if (p[0] < lo) lo = p[0]; if (p[0] > hi) hi = p[0]; }
  for (const off of offs) {
    if (hi + off < -180 || lo + off > 180) continue;
    pts.forEach((p, i) => { if (i === 0) g.moveTo(X(p[0] + off), Y(p[1])); else g.lineTo(X(p[0] + off), Y(p[1])); });
    g.closePath();
  }
}
// anneau : continu, ou qui passe l'antiméridien (longitudes dépliées, recopiées) ; un anneau qui fait le tour d'un pôle est fermé par ce pôle
export function texRing(g, ring, TW, TH) {
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
export function paintEarthTexture(TW, TH) {
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
export function earthGeometry(nx, ny) {
  const geo = new THREE.SphereGeometry(1, nx, ny), uv = geo.attributes.uv, pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    ll(uv.getX(i) * 360 - 180, uv.getY(i) * 180 - 90, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- traits vectoriels : trait de côte et frontières ----------
export function linesMesh(kinds, radius, color, opacity) {
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

export const EARTH_MAP_URL = 'data/earth-drawn.jpg';   // fond de carte dessiné (tools/make-earth-map.mjs)
export function buildEarth(renderer) {
  const group = new THREE.Group();
  const maxTex = renderer.capabilities.maxTextureSize, TW = Math.min(8192, maxTex), TH = TW / 2;
  const tex = new THREE.CanvasTexture(paintEarthTexture(TW, TH));
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const globe = new THREE.Mesh(earthGeometry(1024, 512), wrapLighting(new THREE.MeshLambertMaterial({ map: tex })));
  group.add(globe);
  // fond de carte DESSINÉ (Natural Earth I, domaine public : relief ombré, eau, glaciers) : remplace la peinture procédurale dès qu'il est chargé (http seulement) ; la peinture sert de repli
  if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
    const img = new Image();
    img.onload = () => { try { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = tex.anisotropy; t.needsUpdate = true; globe.material.map = t; globe.material.needsUpdate = true; tex.dispose(); } catch (e) { /* repli : la peinture reste */ } };
    img.onerror = () => {};
    img.src = assetUrl(EARTH_MAP_URL);
  }
  group.add(buildAtmosphere());   // halo bleu de l'atmosphère sur l'horizon
  group.add(linesMesh([2], 1.00003, 0xffffff, 0.85));        // trait de côte : contour net mer / continent
  // frontières des pays : NON affichées par défaut (option « Limites de pays » : voir buildBorders) (demande de l'utilisateur : seulement les limites mer / lac / océan, c'est-à-dire le trait de côte) ; les données restent (linesMesh([0]) et linesMesh([1]))
  return group;
}


// Limites de pays (option de carte) : frontières (jaune pâle) et frontières contestées (orange) en traits vectoriels ; groupe masqué par défaut, posé légèrement au-dessus des traits de côte.
export function buildBorders() {
  const g = new THREE.Group(); g.visible = false; g.name = 'borders';
  g.add(linesMesh([0], 1.00005, 0xfff3c4, 0.9)); g.add(linesMesh([1], 1.00005, 0xffa566, 0.9));
  return g;
}
