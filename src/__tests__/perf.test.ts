// Budget de performance du moteur (rendu factice qui compte les objets et triangles envoyés au GPU) : si une modification fait exploser la charge d'une vue, ce test le dit.
// Vue de départ : la Terre seule coûtait 1,05 million de triangles et chaque sphère d'astre 9 000, même quand elles ne faisaient que quelques pixels (niveaux de détail ajoutés).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEngine } from '@/engine/app'
import { initialEngineState } from '@/store/initial'
import { mergePatch } from '@/store'
import type { Engine, EnginePatch, EngineState } from '@/types'

type Obj = { isMesh?: boolean; isLine?: boolean; isPoints?: boolean; geometry?: { index?: { count: number }; attributes: { position: { count: number } } } }
const ctx2d = new Proxy({} as Record<string, unknown>, { get: (t, k: string) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createImageData' || k === 'getImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }) : k in t ? t[k] : () => {}), set: (t, k: string, v) => { t[k] = v; return true } })
HTMLCanvasElement.prototype.getContext = (() => ctx2d) as unknown as typeof HTMLCanvasElement.prototype.getContext

let drawn = { objects: 0, vertices: 0 }
const fakeRenderer = () => ({
  capabilities: { maxTextureSize: 8192, getMaxAnisotropy: () => 8 }, domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, dispose() {}, outputColorSpace: '',
  render(scene: { traverseVisible: (f: (o: Obj) => void) => void }) {
    drawn = { objects: 0, vertices: 0 }
    scene.traverseVisible((o) => {
      if (!(o.isMesh || o.isLine || o.isPoints) || !o.geometry) return
      drawn.objects++
      drawn.vertices += o.isMesh ? (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 : o.geometry.attributes.position.count
    })
  },
})

describe('budget de performance', () => {
  let engine: Engine, t = 1000
  const measure = (setup: () => void) => {
    setup()
    for (let i = 0; i < 10; i++) engine._frame(performance.now() + (t += 16))
    const t0 = performance.now(), n = 60
    for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 16))
    return { ms: (performance.now() - t0) / n, ...drawn }
  }
  beforeAll(async () => {
    ;(globalThis as unknown as { requestAnimationFrame: () => number }).requestAnimationFrame = () => 0
    let state: EngineState = { ...initialEngineState }
    const canvas = document.createElement('canvas'), overlay = document.createElement('div')
    document.body.append(canvas, overlay)
    engine = createEngine({ canvas, overlay, publish: (p: EnginePatch) => { state = { ...state, ...mergePatch(state, p) } }, createRenderer: fakeRenderer })!
    await new Promise((r) => setTimeout(r, 450))   // les astres sont construits 400 ms après le démarrage
  })
  afterAll(() => { engine.dispose(); document.body.innerHTML = '' })

  it('vue de départ (Terre) : moins de 1,2 million de triangles et de points', () => {
    const r = measure(() => engine.selectView('earth'))
    expect(r.vertices).toBeLessThan(1.2e6)
    expect(r.ms).toBeLessThan(15)
  })
  it('vue Soleil (tout le système, Terre et planètes minuscules) : moins de 300 000', () => {
    const r = measure(() => engine.selectView('sun'))
    expect(r.vertices).toBeLessThan(3e5)
    expect(r.objects).toBeLessThan(45)
    expect(r.ms).toBeLessThan(15)
  })
  it('vue Jupiter et ses lunes : moins de 300 000', () => {
    const r = measure(() => engine.selectView('jupiter'))
    expect(r.vertices).toBeLessThan(3e5)
    expect(r.ms).toBeLessThan(15)
  })
  it('vue Terre dézoomée à fond : moins de 300 000', () => {
    const r = measure(() => { engine.selectView('earth'); for (let i = 0; i < 40; i++) engine.nudge('d+', 15) })
    expect(r.vertices).toBeLessThan(3e5)
  })
})
