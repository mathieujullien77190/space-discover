// Modèle 3D STYLISÉ du télescope spatial Hubble, aux dimensions réelles (mètres) : tube de 13,2 m de long et 4,2 m de diamètre, porte d'ouverture, couronne arrière (instruments), deux grands panneaux solaires (≈ 7,1 × 2,6 m)
// et deux antennes. Repère : x = axe du télescope (ouverture vers +x, aussi le sens de marche dans la scène), y = haut, z = côté. Dessin simplifié (pas de pièces fines) : ce n'est pas un modèle de la NASA.
import * as THREE from 'three';

export const HUBBLE_LENGTH_M = 13.2, HUBBLE_DIAMETER_M = 4.2;

export function buildHubble() {
  const g = new THREE.Group(), mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.5, ...o });
  const R = HUBBLE_DIAMETER_M / 2, add = (geo, m, x, y, z, rz) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); if (rz) mesh.rotation.z = rz; g.add(mesh); return mesh; };
  const cyl = (r0, r1, len) => new THREE.CylinderGeometry(r1, r0, len, 32);   // axe y (tourné ensuite de −90° autour de z pour l'aligner sur x)
  add(cyl(R, R, 9.2), mat('#d9dce2'), 0, 0, 0, -Math.PI / 2);                                  // tube principal (isolant argenté)
  add(cyl(R * 0.98, R * 0.98, 3.6), mat('#b9bcc4'), -6.2, 0, 0, -Math.PI / 2);                 // section arrière
  add(cyl(R * 1.12, R * 1.12, 1.6), mat('#8a8f9a'), -8.6, 0, 0, -Math.PI / 2);                 // couronne arrière : instruments
  add(cyl(R * 0.9, R * 0.9, 0.5), mat('#2a2d36'), 4.8, 0, 0, -Math.PI / 2);                    // bord de l'ouverture
  add(new THREE.CircleGeometry(R * 0.86, 32), mat('#0b0c10', { metalness: 0, side: THREE.DoubleSide }), 5.06, 0, 0).rotation.y = Math.PI / 2;   // ouverture sombre
  add(cyl(R * 0.97, R * 0.97, 3.2), mat('#e8e9ec'), 3.7, 0, 0, -Math.PI / 2);                  // pare-soleil (tube avant)
  for (const side of [1, -1]) {   // panneaux solaires : mât + grand panneau bleu
    add(new THREE.BoxGeometry(0.15, 0.15, 1.2), mat('#555a66'), -1.2, 0, side * (R + 0.6));
    add(new THREE.BoxGeometry(7.1, 0.06, 2.6), mat('#1c3f8f', { metalness: 0.6, roughness: 0.35 }), -1.2, 0, side * (R + 2.4));
  }
  add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), mat('#c8ccd4'), -5, R + 1.2, 0.6);        // antennes à grand gain
  add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), mat('#c8ccd4'), -5, R + 1.2, -0.6);
  return g;
}
