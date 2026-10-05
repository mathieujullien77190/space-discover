// Modèles 3D simplifiés pour l'histoire de Laïka (formes simples, pas à l'échelle exacte) : le chien et le module conique de Spoutnik 2 avec Laïka dedans.
// Unités = mètres (comme les pièces de fusée de launch-3d.js). Fonctions pures three.js, aussi utilisées par l'interface (vue de la cabine).
import * as THREE from 'three';

export const LAIKA_COLORS = { fur: 0xc79a62, furLight: 0xf1e2c4, dark: 0x3a2a1c, padding: 0xd9772b, metal: 0xb4bfce, harness: 0x2b3a55 };

const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85 }, extra || {}));
const mesh = (geo, color, pos, scale, rot) => {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(...pos);
  if (scale) m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  return m;
};

// Chien de type laïka (spitz nordique) stylisé : museau pointu en coin, oreilles dressées triangulaires, collerette de poils épaisse, queue en panache enroulée sur le dos, pelage crème avec une selle sombre ;
// tête vers +x, debout ; longueur ≈ 1,9 et hauteur ≈ 1,4 unités (à mettre à l'échelle).
export function buildDog() {
  const C = LAIKA_COLORS, g = new THREE.Group(), sphere = new THREE.SphereGeometry(1, 20, 14);
  g.add(mesh(sphere, C.furLight, [0, 0.62, 0], [0.64, 0.34, 0.3]));   // corps crème
  g.add(mesh(sphere, C.fur, [-0.05, 0.72, 0], [0.5, 0.2, 0.27]));   // selle sombre sur le dos
  g.add(mesh(sphere, C.furLight, [0.5, 0.78, 0], [0.34, 0.34, 0.33]));   // collerette de poils
  g.add(mesh(sphere, C.furLight, [0.8, 0.92, 0], [0.25, 0.22, 0.21]));   // tête
  g.add(mesh(sphere, C.fur, [0.8, 1.0, 0], [0.22, 0.14, 0.2]));   // calotte sombre sur le crâne
  g.add(mesh(new THREE.ConeGeometry(0.13, 0.42, 12), C.furLight, [1.08, 0.86, 0], [1, 1, 0.85], [0, 0, -Math.PI / 2]));   // museau pointu
  g.add(mesh(sphere, C.dark, [1.3, 0.86, 0], [0.035, 0.035, 0.04]));   // truffe
  for (const z of [-1, 1]) {
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.32, 4), C.fur, [0.74, 1.2, z * 0.13], [1, 1, 0.55], [z * 0.2, Math.PI / 4, 0]));   // oreilles dressées, triangulaires
    g.add(mesh(sphere, C.dark, [0.98, 0.96, z * 0.1], [0.024, 0.024, 0.024]));   // yeux
  }
  const leg = new THREE.CylinderGeometry(0.06, 0.05, 0.46, 10);
  for (const x of [-0.38, 0.4]) for (const z of [-0.15, 0.15]) {
    g.add(mesh(leg, C.furLight, [x, 0.24, z]));   // pattes
    g.add(mesh(sphere, C.furLight, [x + 0.03, 0.03, z], [0.1, 0.04, 0.07]));   // pieds
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 18, Math.PI * 1.5), mat(C.furLight));   // queue en panache enroulée sur le dos
  tail.position.set(-0.64, 0.92, 0);
  tail.rotation.z = Math.PI * 0.15;
  g.add(tail);
  const harness = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 24), mat(C.harness));   // harnais autour du corps
  harness.position.set(0.12, 0.62, 0);
  harness.rotation.y = Math.PI / 2;
  harness.scale.set(1, 1.1, 1);
  g.add(harness);
  return g;
}

// Module de Spoutnik 2 : cône (base de rayon r, hauteur h) en coque transparente (vue « en coupe ») avec Laïka sur son plancher rembourré, une sphère d'instruments au sommet et une antenne.
// L'origine est au centre de la base, l'axe du cône est y.
export function buildLaikaModule(h, r) {
  const C = LAIKA_COLORS, g = new THREE.Group(), hull = h * 0.86;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r, hull, 28, 1, true), new THREE.MeshStandardMaterial({ color: C.metal, metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  shell.position.y = hull / 2;
  g.add(shell);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h * 0.03, 28), mat(C.metal, { metalness: 0.5 }));   // plaque de base
  base.position.y = h * 0.015;
  g.add(base);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, h * 0.05, 28), mat(C.padding));   // plancher rembourré
  deck.position.y = h * 0.055;
  g.add(deck);
  const dog = buildDog(), k = r * 0.5;
  dog.scale.setScalar(k);
  dog.position.set(-0.28 * k, h * 0.08, 0);   // centrée sur l'axe de la fusée (le centre du chien est à x ≈ 0,28)
  g.add(dog);
  const top = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 12), mat(C.metal, { metalness: 0.6 }));   // sphère d'instruments au sommet
  top.position.y = hull + r * 0.12;
  g.add(top);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.012, r * 0.012, h * 0.3, 6), mat(C.dark));
  ant.position.y = hull + r * 0.12 + h * 0.15;
  g.add(ant);
  return g;
}
