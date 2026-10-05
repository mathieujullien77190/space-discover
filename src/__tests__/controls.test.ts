import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { attachControls } from '@/engine/controls'
import { ll } from '@/engine/earth'

// canevas factice : un EventTarget avec ce dont les contrôles ont besoin
const fakeCanvas = () => Object.assign(new EventTarget(), { setPointerCapture: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() }, clientHeight: 800 }) as unknown as HTMLCanvasElement
const ptr = (type: string, init: { x: number; y: number; id?: number }) => Object.assign(new Event(type, { cancelable: true }), { button: 0, clientX: init.x, clientY: init.y, pointerId: init.id ?? 1 })

describe('contrôles autour de l’ISS : le tour est libre, sans butée aux pôles du monde', () => {
  it('glisser 1 000 px vers le haut fait tourner la caméra d’environ 300° sans jamais se bloquer', () => {
    const canvas = fakeCanvas()
    const cam = { fov: 50, mode: 'iss', lon: 10, lat: 20, dist: 0.0001, fly: 0, userUp: null as THREE.Vector3 | null, goal: { lon: 10, lat: 20, dist: 0.0001 } }
    const off = attachControls(canvas, cam as never, vi.fn())
    canvas.dispatchEvent(ptr('pointerdown', { x: 100, y: 1200 }))
    let total = 0
    let prev = ll(cam.lon, cam.lat, new THREE.Vector3())
    for (let i = 1; i <= 1000; i++) {
      canvas.dispatchEvent(ptr('pointermove', { x: 100, y: 1200 - i }))
      const d = ll(cam.lon, cam.lat, new THREE.Vector3())
      total += (prev.angleTo(d) * 180) / Math.PI
      prev = d
    }
    expect(total).toBeGreaterThan(290)   // 1 000 px × 0,3°/px = 300° : avant, la vue butait à 90° du pôle du monde
    expect(total).toBeLessThan(310)
    const u = cam.userUp!
    expect(u.length()).toBeCloseTo(1, 6)
    expect(Math.abs(u.dot(prev))).toBeLessThan(1e-6)   // le haut reste perpendiculaire à la direction de la caméra
    off()
  })

  it('tourner autour de l’axe du haut (glisser de côté) fait bien le tour complet', () => {
    const canvas = fakeCanvas()
    const cam = { fov: 50, mode: 'iss', lon: 0, lat: 30, dist: 0.0001, fly: 0, userUp: null as THREE.Vector3 | null, goal: { lon: 0, lat: 30, dist: 0.0001 } }
    const off = attachControls(canvas, cam as never, vi.fn())
    canvas.dispatchEvent(ptr('pointerdown', { x: 0, y: 100 }))
    for (let i = 1; i <= 1200; i++) canvas.dispatchEvent(ptr('pointermove', { x: i, y: 100 }))   // 1 200 px × 0,3° = 360°
    const d = ll(cam.lon, cam.lat, new THREE.Vector3())
    expect(d.angleTo(ll(0, 30, new THREE.Vector3()))).toBeLessThan(0.05)   // retour au point de départ après un tour
    off()
  })
})
