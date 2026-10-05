import { describe, expect, it, vi } from 'vitest'
import { attachControls } from '@/engine/controls'

// canevas factice : un EventTarget avec ce dont les contrôles ont besoin
const fakeCanvas = () => Object.assign(new EventTarget(), { setPointerCapture: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() }, clientHeight: 800 }) as unknown as HTMLCanvasElement
const ptr = (type: string, init: { button?: number; x: number; y: number; id?: number }) => Object.assign(new Event(type, { cancelable: true }), { button: init.button ?? 0, clientX: init.x, clientY: init.y, pointerId: init.id ?? 1 })

describe('contrôles : appui sur la molette + glisser = monter / descendre', () => {
  const setup = () => {
    const canvas = fakeCanvas()
    const cam = { fov: 50, mode: 'earth', eg: { t: null, goal: null, yaw: 0, tilt: 30, h: 0.1 }, goal: { dist: 3.4, lon: 0, lat: 0 }, lon: 0, lat: 0, dist: 3.4, fly: 0 } as never
    const onClick = vi.fn()
    const off = attachControls(canvas, cam, onClick)
    return { canvas, cam: cam as { eg: { tilt: number; h: number; yaw: number }; goal: { dist: number } }, onClick, off }
  }
  it('molette enfoncée + glisser vers le haut = relever le regard vers l’horizon, vers le bas = regarder sous soi ; l’altitude ne change pas', () => {
    const { canvas, cam, off } = setup()
    const h0 = cam.eg.h
    canvas.dispatchEvent(ptr('pointerdown', { button: 1, x: 100, y: 300 }))
    canvas.dispatchEvent(ptr('pointermove', { button: 1, x: 100, y: 200 }))   // vers le haut : relever le regard
    expect(cam.eg.tilt).toBeGreaterThan(30)
    expect(cam.eg.h).toBe(h0)                                                   // pas de zoom : l’altitude ne change pas
    const up = cam.eg.tilt
    canvas.dispatchEvent(ptr('pointermove', { button: 1, x: 100, y: 330 }))   // vers le bas : regarder sous soi
    expect(cam.eg.tilt).toBeLessThan(up)
    canvas.dispatchEvent(ptr('pointermove', { button: 1, x: 160, y: 330 }))   // de côté : cap
    expect(cam.eg.yaw).not.toBe(0)
    off()
  })
  it('depuis la vue Terre (sans vue au sol), le geste demande au moteur de poser la caméra sur l’axe', () => {
    const canvas = fakeCanvas()
    const cam = { fov: 50, mode: 'earth', eg: null, goal: { dist: 3.4, lon: 0, lat: 0 }, lon: 0, lat: 0, dist: 3.4, fly: 0, ensureGround: vi.fn() } as never
    const off = attachControls(canvas, cam, vi.fn())
    canvas.dispatchEvent(ptr('pointerdown', { button: 1, x: 10, y: 10 }))
    canvas.dispatchEvent(ptr('pointermove', { button: 1, x: 10, y: 0 }))
    expect((cam as { ensureGround: ReturnType<typeof vi.fn> }).ensureGround).toHaveBeenCalled()
    off()
  })
  it('un appui sur la molette ne déclenche pas de clic, et le bouton gauche ne monte pas la caméra', () => {
    const { canvas, cam, onClick, off } = setup()
    canvas.dispatchEvent(ptr('pointerdown', { button: 1, x: 10, y: 10 }))
    canvas.dispatchEvent(ptr('pointerup', { button: 1, x: 10, y: 10 }))
    expect(onClick).not.toHaveBeenCalled()
    const p = cam.eg.tilt
    canvas.dispatchEvent(ptr('pointerdown', { button: 0, x: 10, y: 10, id: 2 }))
    canvas.dispatchEvent(ptr('pointermove', { button: 0, x: 10, y: -40, id: 2 }))   // glisser normal vers le haut : relève le regard vers l’horizon
    expect(cam.eg.tilt).toBeGreaterThan(p)
    off()
  })
})
