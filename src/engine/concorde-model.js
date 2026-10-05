// Modèle 3D STYLISÉ du Concorde aux dimensions réelles (mètres) : fuselage très effilé de 61,7 m, aile delta ogivale de 25,6 m d'envergure, dérive de 12,2 m de haut, quatre réacteurs Olympus sous l'aile (deux par côté) ;
// flammes de postcombustion, feux de bout d'aile (rouge à gauche, vert à droite) et feu blanc arrière, allumés par le moteur la nuit. Repère : x = vers l'avant (le nez), y = vers le haut, z = vers l'aile droite ; origine au milieu du fuselage.
// Dessin détaillé mais simplifié : nez droit (le vrai se baisse au décollage), aile ogivale à bord d'attaque courbe avec élevons, pare-brise, hublots, bande bleue, dérive tricolore, nacelles avec entrées d'air et tuyères.
import * as THREE from 'three';

export const CONCORDE = { lengthM: 61.66, spanM: 25.6, heightM: 12.2, fuselageWidthM: 2.88 };
export const CONCORDE_DIMS = [   // cotes pour les caractéristiques 3D (repère du modèle, mètres)
  { a: [-30.8, 8.2, 0], b: [30.8, 8.2, 0], text: 'Longueur 61,7 m', up: [0, 0, 1] },
  { a: [-3, -2.2, -12.8], b: [-3, -2.2, 12.8], text: 'Envergure 25,6 m', up: [1, 0, 0] },
];

function slab(poly, lo, hi, plane) {   // dalle extrudée : polygone 2D dans un plan, épaisseur lo → hi sur la 3e coordonnée
  const pos = [], idx = [], n = poly.length, v = (p, k) => (plane === 'xz' ? [p[0], k, p[1]] : [p[0], p[1], k]);
  for (const p of poly) pos.push(...v(p, lo)); for (const p of poly) pos.push(...v(p, hi));
  for (let i = 1; i < n - 1; i++) idx.push(0, i + 1, i, n, n + i, n + i + 1);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + i, j, n + j, n + i); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function buildConcorde() {
  const g = new THREE.Group(), L = CONCORDE.lengthM, r = CONCORDE.fuselageWidthM / 2, cx = L / 2;
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f5f8, roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide }), grey = new THREE.MeshStandardMaterial({ color: 0x8e939c, roughness: 0.4, metalness: 0.45 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1b3f9a, roughness: 0.5, side: THREE.DoubleSide }), red = new THREE.MeshStandardMaterial({ color: 0xc8202f, roughness: 0.5, side: THREE.DoubleSide });
  // fuselage : profil de révolution lisse (nez très effilé, long cylindre aplati verticalement, queue relevée), 28 points
  const pts = [[L, 0.02], [L - 0.6, r * 0.14], [L - 1.6, r * 0.27], [L - 3, r * 0.42], [L - 5, r * 0.6], [L - 8, r * 0.78], [L - 11, r * 0.91], [L - 15, r * 0.98], [L - 18, r], [L - 46, r], [L - 50, r * 0.93], [L - 54, r * 0.78], [L - 58, r * 0.5], [L - 60.6, r * 0.28], [0, 0.18]];
  const prof = pts.map(([x, rad]) => new THREE.Vector2(rad, x));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), white); fus.rotation.z = -Math.PI / 2; fus.scale.set(1.1, 1, 1); g.add(fus);   // l'axe y du Lathe devient l'axe x ; fuselage un peu plus haut que large
  // pare-brise noir en visière + hublots du poste de pilotage
  const dark = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.25, metalness: 0.6 });
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 6), dark); visor.scale.set(3.2, 0.5, 1.2); visor.position.set(L - 9.3, r * 0.82, 0); g.add(visor);
  // rangée de hublots (deux côtés) et bande bleue de la livrée Air France
  const win = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 6, 4), dark, 100); let wi = 0, wm = new THREE.Matrix4();
  for (let x = L - 14; x > 8; x -= 0.85) for (const sg of [1, -1]) if (wi < 100) { wm.makeTranslation(x, 0.65, sg * 1.36); win.setMatrixAt(wi++, wm); }
  win.count = wi; g.add(win);
  for (const sg of [1, -1]) g.add(new THREE.Mesh(slab([[L - 8, 0.2], [L - 17, 0.2], [14, 0.2], [14, 0.42], [L - 17, 0.42], [L - 8, 0.38]].map(p => [p[0], p[1]]), sg * 1.33, sg * 1.37, 'xy'), blue));
  // aile delta OGIVALE : bord d'attaque courbe (double courbure), bord de fuite droit, épaisseur qui diminue vers le bout
  const le = z => L - 20.5 - 24.6 * Math.pow(z / 12.8, 0.8) - 2.5 * (z / 12.8);   // x du bord d'attaque à l'abscisse z (> 0)
  const wing = sgn => { const poly = []; for (let i = 0; i <= 12; i++) { const z = 1.4 + (11.4 * i) / 12; poly.push([le(z), sgn * z]); } poly.push([L - 49.6, sgn * 12.8], [L - 49.6, sgn * 1.4]); return sgn > 0 ? poly : poly.reverse(); };
  for (const sg of [1, -1]) { g.add(new THREE.Mesh(slab(wing(sg), -0.9, -0.3, 'xz'), white));
    // gouvernes (élevons) : bande grise sur le bord de fuite
    g.add(new THREE.Mesh(slab([[L - 49.6, sg * 2], [L - 49.6, sg * 12.8], [L - 47.4, sg * 12.8], [L - 47.4, sg * 2]].map(p => p), -0.86, -0.28, 'xz'), grey)); }
  // dérive : tricolore (bleu, blanc, rouge) de bas en haut, légèrement inclinée vers l'arrière
  g.add(new THREE.Mesh(slab([[19.5, r * 0.9], [11.5, 12.2], [9.7, 12.2], [8.8, r * 0.9]], -0.15, 0.15, 'xy'), white));
  g.add(new THREE.Mesh(slab([[16.1, 4.9], [11.5, 12.2], [10.5, 12.2], [12.9, 8.6]], 0.14, 0.17, 'xy'), blue), new THREE.Mesh(slab([[10.3, 4.9], [10.7, 8.2], [9.7, 12.2], [9.2, 12.2]], 0.14, 0.17, 'xy'), red));
  // flammes de POSTCOMBUSTION derrière les 4 réacteurs (cônes additifs orange → blanc au cœur, allumés du décollage jusqu'à l'altitude de croisière : `userData.setFlames(puissance 0–1, temps s)`)
  const flames = [], flame = (x, y, z) => { const grp = new THREE.Group(); grp.position.set(x, y, z); for (const [rad, len, col, op] of [[0.55, 9, 0xff7a1a, 0.55], [0.32, 6, 0xffd27a, 0.7], [0.16, 3.4, 0xffffff, 0.9]]) { const m = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.z = Math.PI / 2; m.position.x = -len / 2; grp.add(m); } grp.visible = false; g.add(grp); return grp; };
  // réacteurs : quatre nacelles sous l'aile (deux par côté), 11,5 m de long
  for (const sgn of [1, -1]) for (const z of [4.0, 5.9]) { const e = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.15, 1.45), grey); e.position.set(L - 40, -1.3, sgn * z); g.add(e);
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 1.4, 12), dark); nz.rotation.z = Math.PI / 2; nz.position.set(L - 40 - 6.4, -1.3, sgn * z); g.add(nz);   // tuyère
    flames.push(flame(L - 40 - 7.1, -1.3, sgn * z));   // flamme de réchauffe derrière la tuyère
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 12), dark); lip.rotation.z = Math.PI / 2; lip.position.set(L - 40 + 5.9, -1.3, sgn * z); g.add(lip); }   // entrée d'air
  // feux : navigation (rouge gauche, vert droite, blanc arrière) et strobes aux bouts d'ailes ; invisibles de jour
  const lamp = (color, x, y, z, k = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35 * k, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, y, z); m.visible = false; return m; };
  const redL = lamp(0xff2a1a, L - 47, -0.5, -12.7), greenL = lamp(0x28ff55, L - 47, -0.5, 12.7), whiteL = lamp(0xfff2e0, 0.3, 0.2, 0), strobeL = lamp(0xffffff, L - 47, -0.5, -12.7, 2), strobeR = lamp(0xffffff, L - 47, -0.5, 12.7, 2);
  g.add(redL, greenL, whiteL, strobeL, strobeR);
  g.children.forEach(c => { c.position.x -= cx; });   // origine au milieu du fuselage
  g.userData.setFlames = (power, t = 0) => { for (let i = 0; i < flames.length; i++) { const k = power * (0.88 + 0.12 * Math.sin(t * 38 + i * 2.1) * Math.sin(t * 23 + i)); flames[i].visible = power > 0.01; flames[i].scale.set(0.6 + 0.4 * k, k, k); } };
  g.userData.flames = flames;
  g.userData.lights = { left: redL, right: greenL, tail: whiteL, strobes: [strobeL, strobeR] };
  return g;
}
