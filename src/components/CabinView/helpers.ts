import * as THREE from 'three'
import { COLORS } from './constants'

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
const mesh = (geo: THREE.BufferGeometry, color: number, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], rot: [number, number, number] = [0, 0, 0]): THREE.Mesh => {
  const m = new THREE.Mesh(geo, mat(color))
  m.position.set(...pos)
  m.scale.set(...scale)
  m.rotation.set(...rot)
  return m
}

// Petit chien stylisé (formes simples) debout sur l'axe x, tête vers +x ; hauteur ≈ 1 unité.
export const buildDog = (): THREE.Group => {
  const g = new THREE.Group()
  const sphere = new THREE.SphereGeometry(1, 20, 14)
  g.add(mesh(sphere, COLORS.fur, [0, 0.62, 0], [0.62, 0.34, 0.3]))   // corps
  g.add(mesh(sphere, COLORS.furLight, [0.28, 0.55, 0], [0.3, 0.3, 0.26]))   // poitrail
  g.add(mesh(sphere, COLORS.fur, [0.78, 0.86, 0], [0.24, 0.22, 0.2]))   // tête
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.14, 0.16), COLORS.furLight, [1.0, 0.8, 0]))   // museau
  g.add(mesh(sphere, COLORS.dark, [1.16, 0.84, 0], [0.04, 0.04, 0.05]))   // truffe
  for (const z of [-0.12, 0.12]) {
    g.add(mesh(new THREE.ConeGeometry(0.1, 0.26, 10), COLORS.dark, [0.7, 1.08, z * 1.5], [1, 1, 1], [z < 0 ? 0.35 : -0.35, 0, 0]))   // oreilles
    g.add(mesh(sphere, COLORS.dark, [0.95, 0.9, z * 1.1], [0.025, 0.025, 0.025]))   // yeux
  }
  const leg = new THREE.CylinderGeometry(0.06, 0.05, 0.45, 10)
  for (const x of [-0.38, 0.4]) for (const z of [-0.16, 0.16]) g.add(mesh(leg, COLORS.fur, [x, 0.24, z]))   // pattes
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.4, 8), COLORS.fur, [-0.74, 0.78, 0], [1, 1, 1], [0, 0, 0.9]))   // queue
  const harness = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 24), mat(COLORS.harness))   // harnais autour du corps
  harness.position.set(0.12, 0.62, 0)
  harness.rotation.y = Math.PI / 2
  harness.scale.set(1, 1.1, 1)
  g.add(harness)
  return g
}

// Cabine : cylindre couché (coque transparente, ouverte à l'avant pour voir dedans), sol et parois rembourrés, hublot-éclairage.
export const buildCabin = (): THREE.Group => {
  const g = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 40, 1, true), new THREE.MeshStandardMaterial({ color: COLORS.metal, metalness: 0.4, roughness: 0.4, transparent: true, opacity: 0.28, side: THREE.DoubleSide }))
  shell.rotation.z = Math.PI / 2
  g.add(shell)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 1.5), mat(COLORS.padding))   // sol rembourré
  pad.position.set(0, -0.55, 0)
  g.add(pad)
  for (const x of [-1.6, 1.6]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 40), mat(COLORS.padding, { transparent: true, opacity: x < 0 ? 0.95 : 0.15 }))
    cap.rotation.z = Math.PI / 2
    cap.position.x = x
    g.add(cap)
  }
  const dog = buildDog()
  dog.position.set(-0.45, -0.5, 0)
  dog.scale.setScalar(1.15)
  g.add(dog)
  return g
}
