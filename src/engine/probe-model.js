import * as THREE from 'three';

// Modèle 3D simplifié d'une sonde (aplats), À L'ÉCHELLE RÉELLE en mètres : antenne parabolique (dishM = diamètre), corps en prisme, mât scientifique, mât du générateur (RTG) ; l'antenne regarde vers +z.
// Les proportions suivent celles de Voyager (antenne 3,7 m, mât du générateur ≈ 3,3 m, mât scientifique ≈ 2,5 m) ; c'est une silhouette reconnaissable, pas une réplique.
export function buildProbeModel(dishM, color) {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xeef0f4, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide }), body = new THREE.MeshStandardMaterial({ color: new THREE.Color(color || '#caa24a'), roughness: 0.6, metalness: 0.3 }), grey = new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.8, metalness: 0.2 });
  const R = 1.1 * dishM, cap = Math.asin(Math.min(1, dishM / 2 / R));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 8, 0, 2 * Math.PI, 0, cap), white); dish.geometry.translate(0, -R * Math.cos(cap), 0); dish.rotation.x = Math.PI / 2; dish.position.z = 0.35 * dishM; g.add(dish);   // calotte : ouverte vers +z
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * dishM, 0.24 * dishM, 0.26 * dishM, 10), body); bus.rotation.x = Math.PI / 2; bus.position.z = 0.1 * dishM; g.add(bus);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * dishM, 0.02 * dishM, 0.5 * dishM, 6), grey); feed.rotation.x = Math.PI / 2; feed.position.z = 0.6 * dishM; g.add(feed);
  const rtg = new THREE.Mesh(new THREE.BoxGeometry(0.9 * dishM, 0.03 * dishM, 0.03 * dishM), grey); rtg.position.set(-0.6 * dishM, 0, -0.1 * dishM); g.add(rtg);
  for (const x of [-0.35, -0.65, -0.95]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * dishM, 0.07 * dishM, 0.2 * dishM, 8), body); r.position.set(x * dishM, 0.0, -0.1 * dishM); r.rotation.z = Math.PI / 2; g.add(r); }   // générateurs
  const sci = new THREE.Mesh(new THREE.BoxGeometry(0.03 * dishM, 0.68 * dishM, 0.03 * dishM), grey); sci.position.set(0.3 * dishM, -0.4 * dishM, -0.1 * dishM); g.add(sci);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.16 * dishM, 0.12 * dishM, 0.14 * dishM), body); cam.position.set(0.3 * dishM, -0.78 * dishM, -0.1 * dishM); g.add(cam);
  return g;
}
