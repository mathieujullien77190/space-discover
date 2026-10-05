// OBSERVATOIRES LUNAIRES : trois sites Apollo où l'on peut se tenir debout sur la Lune (vue depuis le sol, ciel noir, la Terre dans le ciel) avec le drapeau américain, le module lunaire (étage de descente)
// et, pour Apollo 15 et 17, le rover lunaire (LRV). Modèles 3D STYLISÉS aux dimensions réelles ; sol procédural (régolithe, cratères, rochers) ; positions et faits de MÉMOIRE (à vérifier).
// Repère local d'un site (mètres) : x = est, y = haut, z = sud ; origine = le sol sous l'œil.
import * as THREE from 'three';

export const MOON_RADIUS_M = 1737400;
export const MOON_EYE_M = 1.8;                  // hauteur de l'œil d'un astronaute en combinaison

// sites (latitude / longitude sélénographiques en degrés, est positif)
export const MOON_SITES = [
  { id: 'apollo-11', name: 'Apollo 11 · Base de la Tranquillité', short: 'Apollo 11', kind: 'Site d’alunissage (Mare Tranquillitatis)', lat: 0.6741, lon: 23.4730, altM: 0, eyeM: MOON_EYE_M, body: 'moon', scene: 'moon', image: 'data/observatories/apollo-11.png', rover: false, seed: 11,
    facts: [{ label: 'Lieu', value: 'Mer de la Tranquillité (face visible de la Lune)' }, { label: 'Date', value: '20 juillet 1969' }, { label: 'Équipage au sol', value: 'Neil Armstrong et Buzz Aldrin' }, { label: 'Première', value: 'premiers pas d’un humain sur la Lune' }, { label: 'Sur place', value: 'drapeau, module lunaire Eagle (étage de descente)' }] },
  { id: 'apollo-15', name: 'Apollo 15 · Hadley–Apennins', short: 'Apollo 15', kind: 'Site d’alunissage (Hadley Rille)', lat: 26.1322, lon: 3.6333, altM: 0, eyeM: MOON_EYE_M, body: 'moon', scene: 'moon', image: 'data/observatories/apollo-15.png', rover: true, seed: 15,
    facts: [{ label: 'Lieu', value: 'Au pied des monts Apennins, près de la rille Hadley' }, { label: 'Date', value: '30 juillet 1971' }, { label: 'Équipage au sol', value: 'David Scott et James Irwin' }, { label: 'Rover', value: 'premier rover lunaire (LRV), ≈ 28 km parcourus' }, { label: 'Sur place', value: 'drapeau, module lunaire Falcon, rover' }] },
  { id: 'apollo-17', name: 'Apollo 17 · Taurus–Littrow', short: 'Apollo 17', kind: 'Site d’alunissage (vallée de Taurus–Littrow)', lat: 20.1908, lon: 30.7717, altM: 0, eyeM: MOON_EYE_M, body: 'moon', scene: 'moon', image: 'data/observatories/apollo-17.png', rover: true, seed: 17,
    facts: [{ label: 'Lieu', value: 'Vallée de Taurus–Littrow, au bord de la Mer de la Sérénité' }, { label: 'Date', value: '11 décembre 1972' }, { label: 'Équipage au sol', value: 'Eugene Cernan et Harrison Schmitt' }, { label: 'Dernière', value: 'dernière mission humaine sur la Lune à ce jour' }, { label: 'Sur place', value: 'drapeau, module lunaire Challenger, rover' }] },
].map(s => ({ ...s, note: 'Position, dates et faits écrits de mémoire : à vérifier. Modèles 3D stylisés (non historiques).' }));

export const moonSiteById = id => MOON_SITES.find(s => s.id === id) || null;

// disposition des objets autour de l'observateur (mètres, repère local x = est, z = sud)
export const SITE_LAYOUT = { flag: { x: 16, z: 11, yaw: 0.5 }, lander: { x: -42, z: -26, yaw: 0.9 }, rover: { x: -22, z: 34, yaw: -0.6 } };

// repère du site dans la scène d'après la matrice du maillage de la Lune (matrixWorld : échelle = rayon lunaire en rayons terrestres) : œil, sol, haut, est, nord (vecteurs unitaires, coordonnées de la scène)
export function moonSiteFrame(site, matrixWorld, rMeters = MOON_RADIUS_M) {
  const lat = site.lat * Math.PI / 180, lon = site.lon * Math.PI / 180, ll = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
  const eastL = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon));   // dérivée de ll() par rapport à la longitude (même convention que la Terre)
  const up = ll.clone().transformDirection(matrixWorld), east = eastL.clone().transformDirection(matrixWorld), north = new THREE.Vector3().crossVectors(up, east).normalize();
  const ground = ll.clone().applyMatrix4(matrixWorld), unit = new THREE.Vector3().setFromMatrixScale(matrixWorld).x;   // unit : rayon lunaire en unités de scène
  const eye = ground.clone().addScaledVector(up, (site.eyeM || MOON_EYE_M) / rMeters * unit);
  return { ground, eye, up, east, north, south: north.clone().negate(), unit };
}

// ---------- bruit déterministe ----------
const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (hash2(xi, yi, s) * (1 - u) + hash2(xi + 1, yi, s) * u) * (1 - v) + (hash2(xi, yi + 1, s) * (1 - u) + hash2(xi + 1, yi + 1, s) * u) * v; };
const sq = x => x * x;
const prng = seed => { let s = seed * 2654435761 >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

// ---------- relief du sol : courbure de la Lune + ondulations + cratères ----------
export function makeTerrain(seed = 1) {
  const r = prng(seed * 7919 + 13), craters = [];
  for (let i = 0; i < 70; i++) { const rad = 8 + Math.pow(r(), 2.2) * 330, a = r() * 2 * Math.PI, d = 60 + Math.sqrt(r()) * 4200; craters.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: rad, depth: rad * (0.1 + 0.08 * r()) }); }   // aucun cratère à moins de 60 m de l'observateur
  const height = (x, z) => {
    const d2 = x * x + z * z; let h = -d2 / (2 * MOON_RADIUS_M);   // courbure de la Lune : à 2,6 km de l'œil le sol est 2 m plus bas
    const calm = Math.min(1, Math.max(0, (Math.sqrt(d2) - 25) / 120));   // plat près de l'observateur et des objets
    h += calm * (0.6 * (vnoise(x / 70, z / 70, seed) - 0.5) + 0.25 * (vnoise(x / 17, z / 17, seed + 5) - 0.5));
    for (const c of craters) { const dx = x - c.x, dz = z - c.z, rho = Math.sqrt(dx * dx + dz * dz) / c.r; if (rho < 1.35) h += rho < 1 ? -c.depth * (1 - rho * rho) : c.depth * 0.18 * Math.exp(-sq((rho - 1.05) * 6)); }   // cuvette + léger bourrelet
    return h;
  };
  return { height, craters };
}

// maillage polaire du sol (anneaux de plus en plus espacés : 1,5 m près de l'observateur, ≈ 8 km au bout) : { geometry, rMax }
export function groundGeometry(height, rings = 170, sectors = 160, r0 = 1.5, growth = 1.052) {
  const nV = (rings + 1) * (sectors + 1) + 1, pos = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), idx = [];
  const put = (i, x, z) => { pos[3 * i] = x; pos[3 * i + 1] = height(x, z); pos[3 * i + 2] = z; uv[2 * i] = x / 18; uv[2 * i + 1] = z / 18; };
  put(0, 0, 0);
  for (let k = 0; k <= rings; k++) { const rad = r0 * Math.pow(growth, k); for (let s = 0; s <= sectors; s++) { const a = s / sectors * 2 * Math.PI; put(1 + k * (sectors + 1) + s, Math.cos(a) * rad, Math.sin(a) * rad); } }
  for (let s = 0; s < sectors; s++) idx.push(0, 1 + s + 1, 1 + s);   // éventail central
  for (let k = 0; k < rings; k++) for (let s = 0; s < sectors; s++) { const a = 1 + k * (sectors + 1) + s, b = a + 1, c = a + sectors + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  // les triangles de l'éventail sont orientés pour regarder vers le haut : on calcule les normales puis on s'assure qu'elles pointent vers +y
  g.computeVertexNormals(); const nrm = g.attributes.normal; if (nrm.getY(5) < 0) { for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i)); const ix = g.index; for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } }
  return { geometry: g, rMax: r0 * Math.pow(growth, rings) };
}

// texture du régolithe : gris mouchetés, sans couture (bruit sur un tore), 512 × 512
export function regolithPixels(n = 512, seed = 3) {
  const out = new Uint8Array(n * n * 4), P = 8;   // période du bruit en cellules
  const tor = (x, y, sc, s) => { const fx = x / n * sc, fy = y / n * sc, xi = Math.floor(fx), yi = Math.floor(fy), xf = fx - xi, yf = fy - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = Math.round(sc), h = (a, b) => hash2(((a % m) + m) % m, ((b % m) + m) % m, s); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const g = 0.36 + 0.12 * tor(i, j, P, seed) + 0.08 * tor(i, j, P * 4, seed + 1) + 0.06 * tor(i, j, P * 16, seed + 2) + (hash2(i, j, seed + 9) - 0.5) * 0.1;   // grain fin
    const o = (j * n + i) * 4, v = Math.max(0, Math.min(1, g)) * 255; out[o] = v * 1.02; out[o + 1] = v; out[o + 2] = v * 0.94; out[o + 3] = 255;   // gris légèrement chaud
  }
  return out;
}

// drapeau américain en pixels (stries rouges et blanches, carré bleu avec étoiles) : w × h
export function flagPixels(w = 260, h = 136) {
  const out = new Uint8Array(w * h * 4), cw = Math.floor(w * 0.4), ch = Math.floor(h * 7 / 13);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = Math.floor(y / h * 13) % 2 === 0 ? [178, 34, 52] : [255, 255, 255];
    if (x < cw && y < ch) { c = [60, 59, 110]; const row = Math.floor(y / ch * 9), cols = row % 2 === 0 ? 6 : 5, cellW = cw / 6, px = (x - (row % 2 === 0 ? 0 : cellW / 2)) / cellW, fx = px - Math.floor(px), fy = (y / ch * 9) - row; if (row >= 0 && row < 9 && px >= 0 && px < cols && Math.hypot(fx - 0.5, (fy - 0.5) * 1.25) < 0.22) c = [255, 255, 255]; }
    const o = (y * w + x) * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  return out;
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, ...o });

// DRAPEAU : mât de 2,4 m, tringle horizontale en haut, toile de 1,2 × 0,9 m (rigide : pas de vent sur la Lune) ; origine au pied du mât, la toile s'étend vers +x local
export function buildFlag() {
  const g = new THREE.Group(), tex = new THREE.DataTexture(flagPixels(), 260, 136, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 8), std(0xcfd3d8)); pole.position.y = 1.2; g.add(pole);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.25, 6), std(0xcfd3d8)); rod.rotation.z = Math.PI / 2; rod.position.set(0.62, 2.38, 0); g.add(rod);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide })); cloth.position.set(0.62, 1.96, 0); g.add(cloth);
  return g;
}

// ÉTAGE DE DESCENTE du module lunaire : octogone de ≈ 4,2 m recouvert de feuilles dorées, quatre jambes avec patins, échelle ; origine au sol, centré
export function buildLander() {
  const g = new THREE.Group(), gold = std(0xc89b3c, { metalness: 0.7, roughness: 0.35 }), grey = std(0xb9bcc2);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.7, 8), gold); body.position.y = 2.55; g.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, 0.5, 8), gold); top.position.y = 3.65; g.add(top);
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 1.0, 12), std(0x3a3a3e)); engine.position.y = 1.35; g.add(engine);   // tuyère
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, dx = Math.cos(a), dz = Math.sin(a), leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.3, 6), grey);
    leg.position.set(dx * 3.0, 1.5, dz * 3.0); leg.rotation.set(-dz * 0.55, 0, dx * 0.55); g.add(leg);   // jambe inclinée vers l'extérieur
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), grey); pad.position.set(dx * 3.9, 0.06, dz * 3.9); g.add(pad);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), grey); strut.position.set(dx * 1.8, 2.4, dz * 1.8); strut.rotation.set(-dz * 0.9, 0, dx * 0.9); g.add(strut);
  }
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.06), grey); ladder.position.set(0, 1.7, 2.35); ladder.rotation.x = -0.12; g.add(ladder);
  return g;
}

// ROVER LUNAIRE (LRV) : longueur 3,1 m, voie 1,8 m, roues en treillis de 82 cm, deux sièges, pupitre central, antenne parabolique à gain élevé, caméra, batteries ; avant = +x ; origine au sol, centré
export function buildRover() {
  const g = new THREE.Group(), frame = std(0x9da1a8, { metalness: 0.5 }), foil = std(0xd8b24a, { metalness: 0.7, roughness: 0.35 }), glass = std(0xd9cfb8, { roughness: 0.8, metalness: 0.05 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };
  box(1.7, 0.1, 1.3, frame, 0, 0.62, 0);            // plateforme centrale
  box(0.8, 0.1, 1.5, frame, 1.2, 0.6, 0);            // châssis avant
  box(0.9, 0.1, 1.5, frame, -1.2, 0.6, 0);           // châssis arrière
  box(0.7, 0.4, 0.5, foil, -1.3, 0.85, 0);           // batteries (feuilles dorées)
  for (const z of [-0.36, 0.36]) { box(0.5, 0.05, 0.5, std(0xcfd8e6), 0.1, 0.78, z); box(0.06, 0.5, 0.5, std(0xcfd8e6), -0.14, 1.02, z); }   // sièges
  box(0.3, 0.3, 0.55, frame, 0.75, 0.9, 0);          // pupitre
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), frame); t.rotation.x = Math.PI / 2; t.position.set(0.65, 1.12, 0); g.add(t);   // manche
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), frame); mast.position.set(1.25, 1.1, 0); g.add(mast);
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.18, 24, 1, true), std(0xe9e9e9, { side: THREE.DoubleSide, roughness: 0.5 })); dish.position.set(1.25, 1.65, 0); dish.rotation.set(Math.PI / 2 + 0.5, 0, 0); g.add(dish);   // antenne parabolique ouverte, inclinée vers le haut
  const lga = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 5), frame); lga.position.set(1.45, 1.55, 0.35); g.add(lga);   // antenne à faible gain
  box(0.22, 0.18, 0.16, std(0x333338), 1.4, 1.15, -0.4);   // caméra
  for (const [x, z] of [[1.15, 0.9], [1.15, -0.9], [-1.15, 0.9], [-1.15, -0.9]]) {   // roues en treillis + fixation + garde-boue
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.23, 20, 3, true), new THREE.MeshStandardMaterial({ color: 0x8d8f93, wireframe: true, roughness: 0.6, metalness: 0.4 })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.41, z); g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 10), frame); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.41, z); g.add(hub);
    box(0.95, 0.04, 0.3, glass, x, 0.88, z * 1.04);
    box(0.06, 0.45, 0.06, frame, x, 0.65, z * 0.8);
  }
  return g;
}

// rochers : petits blocs gris posés sur le sol (InstancedMesh) ; height(x, z) donne l'altitude du sol
export function buildRocks(height, seed = 1, count = 260) {
  const r = prng(seed * 31 + 7), geo = new THREE.IcosahedronGeometry(0.5, 0), mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x5f5e5c, roughness: 0.95, metalness: 0 }), count), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const d = 6 + Math.pow(r(), 1.6) * 260, a = r() * 2 * Math.PI, x = Math.cos(a) * d, z = Math.sin(a) * d, size = 0.12 + Math.pow(r(), 3) * 1.4;
    e.set(r() * 3, r() * 6, r() * 3); q.setFromEuler(e); s.set(size * (0.8 + r() * 0.6), size * (0.5 + r() * 0.4), size * (0.8 + r() * 0.6)); p.set(x, height(x, z) + size * 0.15, z); m.compose(p, q, s); mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; return mesh;
}

// le site complet (en mètres) : sol + rochers + drapeau + module lunaire (+ rover) ; group.userData.height(x, z) donne l'altitude du sol
export function buildMoonSite(site) {
  const g = new THREE.Group(), { height } = makeTerrain(site.seed || 1), { geometry, rMax } = groundGeometry(height);
  const tex = new THREE.DataTexture(regolithPixels(512, site.seed || 1), 512, 512, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
  const ground = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: tex })); ground.frustumCulled = false; g.add(ground);
  g.add(buildRocks(height, site.seed || 1));
  const place = (obj, spec) => { obj.position.set(spec.x, height(spec.x, spec.z), spec.z); obj.rotation.y = spec.yaw; g.add(obj); return obj; };
  const flag = place(buildFlag(), SITE_LAYOUT.flag), lander = place(buildLander(), SITE_LAYOUT.lander), rover = site.rover ? place(buildRover(), SITE_LAYOUT.rover) : null;
  g.userData = { height, rMax, flag, lander, rover, ground };
  return g;
}
