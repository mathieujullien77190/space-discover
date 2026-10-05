import * as THREE from 'three'
import { buildDog } from '@/engine/laika-model'
import { COLORS } from './constants'

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
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
