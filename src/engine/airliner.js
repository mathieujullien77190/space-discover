// AVION « SCÉNARIO » (Airbus A320) : quand on lance la vue depuis un observatoire, un avion apparaît au bon endroit pour passer plus ou moins au-dessus de l'observatoire, de jour comme de nuit.
// C'est un vrai objet de la scène, comme l'ISS : il continue de voler si on quitte la vue observatoire (on peut le voir de loin comme un point) et DISPARAÎT D'UN COUP dès qu'il n'est plus visible
// depuis l'observatoire (sous 12° d'élévation) ou qu'il a fini son trajet. Vol à altitude constante (≈ 10 000 m), ligne droite, ≈ 240 m/s (≈ 860 km/h), au-dessus d'un sol sphérique (il suit la courbure).
// Modèle 3D STYLISÉ aux dimensions de l'A320 : longueur 37,6 m, envergure 35,8 m, hauteur 11,8 m (fuselage, ailes en flèche de 25°, empennage, dérive bleue, deux réacteurs) ; feux de bout d'aile rouge / vert.
import * as THREE from 'three';

export const A320 = { lengthM: 37.57, spanM: 35.8, heightM: 11.76, fuselageDiameterM: 3.95 };
export const AIRLINER_ALTITUDE_M = [9500, 10500], AIRLINER_SPEED_MS = [230, 250];
export const AIRLINER_CLOSEST_M = [0, 9000];        // distance horizontale minimale de passage : de « pile au-dessus » à 9 km de côté
export const AIRLINER_START_ELEVATION_DEG = [9, 17];   // hauteur à laquelle il apparaît dans le ciel de l'observatoire : DE LOIN (≈ 35 à 65 km de distance horizontale)
export const AIRLINER_MIN_ELEVATION_DEG = 8;        // en dessous, il n'est plus visible de l'observatoire : il disparaît d'un coup
const DEG = Math.PI / 180, R_M = 6378137;
const range = (r, [a, b]) => a + (b - a) * r;

// trajectoire : repère local de l'observatoire (x = est, y = nord), s = abscisse le long de la route depuis le point de passage le plus proche
export function makeAirlinerTrack(rand = Math.random) {
  const H = range(rand(), AIRLINER_ALTITUDE_M), speed = range(rand(), AIRLINER_SPEED_MS), c = range(rand(), AIRLINER_CLOSEST_M);
  const heading = rand() * 2 * Math.PI, side = rand() < 0.5 ? 1 : -1, hx = Math.sin(heading), hy = Math.cos(heading), nx = side * -hy, ny = side * hx;
  const d0 = H / Math.tan(range(rand(), AIRLINER_START_ELEVATION_DEG) * DEG), s0 = -Math.sqrt(Math.max(1, d0 * d0 - c * c));   // il apparaît déjà à 9–17° d'élévation
  const dEnd = H / Math.tan(AIRLINER_MIN_ELEVATION_DEG * DEG), S = Math.sqrt(Math.max(1, dEnd * dEnd - c * c));               // et disparaît à 8°
  return { H, speed, c, hx, hy, nx, ny, s0, S };
}

// état après t secondes : position dans le repère local (m), cap, fin du trajet
export function airlinerAt(tr, t) {
  const s = tr.s0 + tr.speed * t;
  return { s, done: s > tr.S, local: [tr.c * tr.nx + s * tr.hx, tr.c * tr.ny + s * tr.hy, tr.H], heading: [tr.hx, tr.hy] };
}

// position dans la scène (rayons terrestres, repère de la Terre) : on part du pied de l'observatoire, on avance de (x, y) mètres à l'horizontale puis on remonte radialement à rayon constant (altitude H au-dessus du niveau de la mer + altitude de l'observatoire)
// frame : { up, east, north } (tableaux unitaires du lieu), groundRadius : rayon du sol de l'observatoire (rayons terrestres)
export function airlinerWorld(local, frame, groundRadius, out = new THREE.Vector3()) {
  const up = new THREE.Vector3().fromArray(frame.up), e = new THREE.Vector3().fromArray(frame.east), n = new THREE.Vector3().fromArray(frame.north);
  out.copy(up).multiplyScalar(groundRadius).addScaledVector(e, local[0] / R_M).addScaledVector(n, local[1] / R_M);
  return out.normalize().multiplyScalar(groundRadius + local[2] / R_M);
}
// élévation (°) de l'avion vu de l'œil de l'observatoire (eye : position de l'œil, rayons terrestres ; up : verticale du lieu)
export function elevationFrom(pos, eye, up, tmp = new THREE.Vector3()) {
  tmp.copy(pos).sub(eye); const d = tmp.length(); return d > 0 ? Math.asin(Math.max(-1, Math.min(1, tmp.dot(new THREE.Vector3().fromArray(up)) / d))) / DEG : -90;
}

// dalle extrudée : polygone 2D (points [a, b]) dans un plan, épaisseur selon la 3e coordonnée (de lo à hi)
function slab(poly, lo, hi, plane) {
  const pos = [], idx = [], n = poly.length, v = (p, k) => (plane === 'xz' ? [p[0], k, p[1]] : [p[0], p[1], k]);
  for (const p of poly) pos.push(...v(p, lo)); for (const p of poly) pos.push(...v(p, hi));
  for (let i = 1; i < n - 1; i++) { idx.push(0, i + 1, i, n, n + i, n + i + 1); }   // dessus et dessous (éventail)
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + i, j, n + j, n + i); }   // côtés
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// A320 stylisé : x = vers l'avant, y = vers le haut, z = vers l'aile droite ; origine au milieu du fuselage
export function buildA320() {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }), blue = new THREE.MeshStandardMaterial({ color: 0x1b4f9c, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }), grey = new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.4, metalness: 0.4 });
  const L = A320.lengthM, r = A320.fuselageDiameterM / 2, cx = L / 2;   // le fuselage va de x = 0 (queue) à x = L (nez) avant recentrage
  // fuselage : profil de révolution (rayon selon l'abscisse) : nez arrondi, partie cylindrique, cône de queue
  const prof = [[L, 0.05], [L - 0.5, r * 0.5], [L - 2.2, r * 0.9], [L - 4.5, r], [9, r], [4.5, r * 0.8], [1.5, r * 0.4], [0, 0.25]].map(([x, rad]) => new THREE.Vector2(rad, x));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), white); fus.rotation.z = -Math.PI / 2; g.add(fus);   // l'axe y du Lathe devient l'axe x (vers l'avant)
  // ailes en flèche de 25° (extrémité en arrière), deux côtés
  const tipLe = 20.5 - Math.tan(25 * DEG) * 15.6;   // bord d'attaque au bout de l'aile (flèche de 25° : le bout est en ARRIÈRE)
  const wing = (sgn) => slab([[20.5, sgn * 1.8], [tipLe, sgn * (A320.spanM / 2)], [tipLe - 1.5, sgn * (A320.spanM / 2)], [14.0, sgn * 1.8]], -0.55, -0.2, 'xz');
  g.add(new THREE.Mesh(wing(1), white), new THREE.Mesh(wing(-1), white));
  // plan fixe horizontal et dérive
  const stab = (sgn) => slab([[3.4, sgn * 0.8], [1.6, sgn * 6.2], [0.6, sgn * 6.2], [0.6, sgn * 0.8]], 0.3, 0.45, 'xz');
  g.add(new THREE.Mesh(stab(1), white), new THREE.Mesh(stab(-1), white));
  g.add(new THREE.Mesh(slab([[4.6, r * 0.6], [1.2, A320.heightM - r + 0.4], [0.0, A320.heightM - r + 0.4], [0.2, r * 0.6]], -0.18, 0.18, 'xy'), blue));   // dérive
  // réacteurs sous les ailes
  for (const sgn of [1, -1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.85, 3.4, 16), grey); e.rotation.z = Math.PI / 2; e.position.set(18.5, -1.55, sgn * 5.8); g.add(e); }
  // feux : navigation FIXES (rouge à gauche, vert à droite, blanc à l'arrière) et STROBES blancs clignotants aux bouts d'ailes ; allumés SEULEMENT LA NUIT (pilotés par le moteur)
  const lamp = (color, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(tipLe - 0.4, -0.4, z); m.visible = false; return m; };   // allumés seulement la nuit (visible = false par défaut)
  const redL = lamp(0xff2a1a, -A320.spanM / 2 + 0.1), greenL = lamp(0x28ff55, A320.spanM / 2 - 0.1), whiteL = lamp(0xfff2e0, 0); whiteL.position.set(0.4, 1.2, 0);   // navigation : rouge (gauche), vert (droite), blanc à l'arrière
  const strobeL = lamp(0xffffff, -A320.spanM / 2 + 0.1), strobeR = lamp(0xffffff, A320.spanM / 2 - 0.1); strobeL.scale.setScalar(1.8); strobeR.scale.setScalar(1.8);   // strobes : flashs blancs aux bouts d'ailes
  g.add(redL, greenL, whiteL, strobeL, strobeR);
  g.children.forEach(c => { c.position.x -= cx; });   // recentre : origine au milieu du fuselage
  g.userData.lights = { left: redL, right: greenL, tail: whiteL, strobes: [strobeL, strobeR] };
  return g;
}
