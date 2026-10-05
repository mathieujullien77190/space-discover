// Modèle 3D STYLISÉ du Concorde aux dimensions réelles (mètres) : fuselage très effilé de 61,7 m, aile delta ogivale de 25,6 m d'envergure, dérive de 12,2 m de haut, quatre réacteurs Olympus sous l'aile (deux par côté) ;
// feux de bout d'aile (rouge à gauche, vert à droite) et feu blanc arrière, allumés par le moteur la nuit. Repère : x = vers l'avant (le nez), y = vers le haut, z = vers l'aile droite ; origine au milieu du fuselage.
// Dessin simplifié (le vrai nez se baisse au décollage, ici il est droit ; pas de fenêtres ni de livrée détaillée).
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
  // fuselage : profil de révolution (nez effilé, long cylindre, queue)
  const prof = [[L, 0.04], [L - 3, r * 0.4], [L - 8, r * 0.78], [L - 15, r], [L - 46, r], [L - 53, r * 0.78], [L - 59, r * 0.4], [0, 0.22]].map(([x, rad]) => new THREE.Vector2(rad, x));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), white); fus.rotation.z = -Math.PI / 2; g.add(fus);   // l'axe y du Lathe devient l'axe x (vers le nez)
  // aile delta ogivale (bord d'attaque courbe), deux côtés
  const wing = sgn => slab([[L - 22, sgn * 1.4], [L - 28, sgn * 3.6], [L - 34, sgn * 6.4], [L - 40, sgn * 9.6], [L - 44.6, sgn * 12.8], [L - 49.6, sgn * 12.8], [L - 49.6, sgn * 1.4]], -0.75, -0.3, 'xz');
  g.add(new THREE.Mesh(wing(1), white), new THREE.Mesh(wing(-1), white));
  // dérive : tricolore (bleu, blanc, rouge) de bas en haut, légèrement inclinée vers l'arrière
  g.add(new THREE.Mesh(slab([[19.5, r * 0.9], [11.5, 12.2], [9.7, 12.2], [8.8, r * 0.9]], -0.15, 0.15, 'xy'), white));
  g.add(new THREE.Mesh(slab([[16.1, 4.9], [11.5, 12.2], [10.5, 12.2], [12.9, 8.6]], 0.14, 0.17, 'xy'), blue), new THREE.Mesh(slab([[10.3, 4.9], [10.7, 8.2], [9.7, 12.2], [9.2, 12.2]], 0.14, 0.17, 'xy'), red));
  // réacteurs : quatre nacelles sous l'aile (deux par côté), 11,5 m de long
  for (const sgn of [1, -1]) for (const z of [4.0, 5.9]) { const e = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.15, 1.45), grey); e.position.set(L - 40, -1.3, sgn * z); g.add(e); }
  // feux : navigation (rouge gauche, vert droite, blanc arrière) et strobes aux bouts d'ailes ; invisibles de jour
  const lamp = (color, x, y, z, k = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35 * k, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, y, z); m.visible = false; return m; };
  const redL = lamp(0xff2a1a, L - 47, -0.5, -12.7), greenL = lamp(0x28ff55, L - 47, -0.5, 12.7), whiteL = lamp(0xfff2e0, 0.3, 0.2, 0), strobeL = lamp(0xffffff, L - 47, -0.5, -12.7, 2), strobeR = lamp(0xffffff, L - 47, -0.5, 12.7, 2);
  g.add(redL, greenL, whiteL, strobeL, strobeR);
  g.children.forEach(c => { c.position.x -= cx; });   // origine au milieu du fuselage
  g.userData.lights = { left: redL, right: greenL, tail: whiteL, strobes: [strobeL, strobeR] };
  return g;
}
