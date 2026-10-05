import { describe, expect, it, vi } from 'vitest'
import { attachControls } from '@/engine/controls'

// canevas factice : un EventTarget avec ce dont les contrôles ont besoin
const fakeCanvas = () => Object.assign(new EventTarget(), { setPointerCapture: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() }, clientHeight: 800 }) as unknown as HTMLCanvasElement
const ptr = (type: string, init: { button?: number; x: number; y: number; id?: number }) => Object.assign(new Event(type, { cancelable: true }), { button: init.button ?? 0, clientX: init.x, clientY: init.y, pointerId: init.id ?? 1 })

describe('contrôles : appui sur la molette + glisser = monter / descendre', () => {
  const setup = () => {
    const canvas = fakeCanvas()
    const cam = { fov: 50, mode: 'earth', eg: { t: null, goal: null, yaw: 0, pitch: 45, dist: 0.002 }, goal: { dist: 3.4, lon: 0, lat: 0 }, lon: 0, lat: 0, dist: 3.4, fly: 0 } as never
    const onClick = vi.fn()
    const off = attachControls(canvas, cam, onClick)
    return { canvas, cam: cam as { eg: { pitch: number; dist: number; yaw: number }; goal: { dist: number } }, onClick, off }
  }
  it('vue au sol : monter relève la visée et allonge la distance, descendre l’inverse (la distance horizontale reste)', () => {
    const { canvas, cam, off } = setup()
    const dh = cam.eg.dist * Math.cos((45 * Math.PI) / 180)
    canvas.dispatchEvent(ptr('pointerdown', { button: 1, x: 100, y: 300 }))
    canvas.dispatchEvent(ptr('pointermove', { button: 1, x: 100, y: 200 }))   // vers le haut : monter
    expect(cam.eg.pitch).toBeGreaterThan(45)
    expect(cam.eg.dist * Math.cos((cam.eg.pitch * Math.PI) / 180)).toBeCloseTo(dh, 6)
    const up = cam.eg.pitch
    canvas.dispatchEvent(ptr('pointermove', { button: 1, x: 100, y: 330 }))   // vers le bas : descendre
    expect(cam.eg.pitch).toBeLessThan(up)
    expect(cam.eg.yaw).toBe(0)                                                  // le cap ne bouge pas
    off()
  })
  it('un appui sur la molette ne déclenche pas de clic, et le bouton gauche ne monte pas la caméra', () => {
    const { canvas, cam, onClick, off } = setup()
    canvas.dispatchEvent(ptr('pointerdown', { button: 1, x: 10, y: 10 }))
    canvas.dispatchEvent(ptr('pointerup', { button: 1, x: 10, y: 10 }))
    expect(onClick).not.toHaveBeenCalled()
    const p = cam.eg.pitch
    canvas.dispatchEvent(ptr('pointerdown', { button: 0, x: 10, y: 10, id: 2 }))
    canvas.dispatchEvent(ptr('pointermove', { button: 0, x: 10, y: 60, id: 2 }))   // glisser normal : incline (autre geste)
    expect(cam.eg.pitch).not.toBe(p)
    off()
  })
})
