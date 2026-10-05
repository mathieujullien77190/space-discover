// Démarrage du moteur 3D complet (vrai three.js, rendu factice : pas de WebGL) : il publie son état, répond aux commandes, lance une fusée et s'arrête proprement.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEngine } from '@/engine/app'
import { initialEngineState } from '@/store/initial'
import { mergePatch } from '@/store'
import type { Engine, EnginePatch, EngineState } from '@/types'

// jsdom n'a pas de canvas 2D : contexte factice (les textures peintes par le moteur ne sont pas vérifiées ici)
const ctx2d = new Proxy({} as Record<string, unknown>, { get: (t, k: string) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'createImageData' || k === 'getImageData' ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }) : k in t ? t[k] : () => {}), set: (t, k: string, v) => { t[k] = v; return true } })
HTMLCanvasElement.prototype.getContext = (() => ctx2d) as unknown as typeof HTMLCanvasElement.prototype.getContext

const fakeRenderer = () => ({ capabilities: { maxTextureSize: 8192, getMaxAnisotropy: () => 8 }, domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, outputColorSpace: '' })

describe('createEngine (rendu factice)', () => {
  let state: EngineState, engine: Engine, overlay: HTMLElement, canvas: HTMLCanvasElement
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0)
    state = { ...initialEngineState }
    canvas = document.createElement('canvas')
    overlay = document.createElement('div')
    document.body.append(canvas, overlay)
    const e = createEngine({ canvas, overlay, publish: (p: EnginePatch) => { state = { ...state, ...mergePatch(state, p) } }, createRenderer: fakeRenderer })
    if (!e) throw new Error('moteur non créé')
    engine = e
  })
  afterEach(() => { engine.dispose(); vi.unstubAllGlobals(); document.body.innerHTML = '' })

  it('publie l’état après une image', () => {
    engine._frame(performance.now() + 300)
    expect(state.status).toBe('ready')
    expect(state.info).toMatch(/Caméra/)
    expect(state.info).toMatch(/ISS/)
    expect(state.scale.label).not.toBe('')
    expect(state.time.simMs).toBeGreaterThan(0)
  })
  it('change de vue : Lune, ISS puis Terre', () => {
    engine._frame(performance.now() + 300)
    engine.selectView('moon')
    expect(state.view).toEqual({ mode: 'solar', selected: 'moon' })
    engine.goIss()
    expect(state.view).toEqual({ mode: 'iss', selected: null })
    engine.selectView('earth')
    expect(state.view).toEqual({ mode: 'earth', selected: 'earth' })
  })
  it('vue éloignée : la Terre est affichée en priorité, la Lune collée à elle est masquée', async () => {
    engine.selectView('sun')
    await new Promise((r) => setTimeout(r, 450))   // les astres sont construits 400 ms après le démarrage
    for (let i = 0; i < 3; i++) engine._frame(performance.now() + 1000 + i * 100)
    const label = (text: string) => [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((e) => e.textContent === text)
    expect(label('Terre')?.style.display).toBe('block')
    expect(label('Lune')?.style.display).toBe('none')
  })
  it('vue Terre dézoomée à fond : la Terre est marquée (son orbite autour du Soleil devient visible)', async () => {
    await new Promise((r) => setTimeout(r, 450))
    engine._frame(performance.now() + 1000)
    for (let i = 0; i < 60; i++) engine.nudge('d+', 15)
    for (let i = 0; i < 40; i++) engine._frame(performance.now() + 2000 + i * 100)
    expect(JSON.parse(state.viewJson).altKm).toBeGreaterThan(1e8)   // plus de 100 millions de km d'altitude
    const terre = [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((e) => e.textContent === 'Terre')
    expect(terre?.style.display).toBe('block')
  })
  it('règle la vitesse du temps', () => {
    engine.setSimSpeed(3600)
    expect(state.time.speed).toBe(3600)
    engine.resetTime()
    expect(state.time.speed).toBe(1)
  })
  it('lance Ariane 5 : étapes, composants, télémétrie ; puis arrêt', async () => {
    engine._frame(performance.now() + 300)
    await engine.startRocket('obj:ariane5')
    expect(state.rocket.running).toBe(true)
    expect(state.rocket.steps[0].label).toBe('Décollage')
    expect(state.rocket.steps.length).toBeGreaterThan(5)
    expect(state.rocket.components.map((c) => c.id)).toContain('rocket')
    expect(state.view.mode).toBe('launch')
    expect(state.time.visible).toBe(false)
    engine.setRocketSpeed(60)
    for (let i = 0; i < 20; i++) engine._frame(performance.now() + 300 + i * 250)
    expect(state.rocket.T).toBeGreaterThan(0)
    expect(state.rocket.telemetry.alt).toBeGreaterThan(0)
    engine.stopRocket()
    expect(state.rocket.running).toBe(false)
    expect(state.time.visible).toBe(true)
    expect(state.view.mode).toBe('earth')
  })
  it('les étiquettes 3D vivent dans le conteneur fourni et sont retirées à l’arrêt du moteur', () => {
    expect(overlay.querySelectorAll('.eng-l3d').length).toBeGreaterThan(0)
    engine.dispose()
    expect(overlay.querySelectorAll('.eng-l3d').length).toBe(0)
  })
})
