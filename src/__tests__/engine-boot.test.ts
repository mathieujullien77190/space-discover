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
  it('vue éloignée : un clic sur la Terre ramène à la vue Terre (comme Mars mène à sa vue)', async () => {
    engine.selectView('sun')
    await new Promise((r) => setTimeout(r, 450))
    for (let i = 0; i < 3; i++) engine._frame(performance.now() + 1000 + i * 100)
    const terre = [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((e) => e.textContent === 'Terre')
    const m = /translate[(]([-0-9.]+)px,([-0-9.]+)px[)]/.exec(terre?.style.transform ?? '')
    expect(m).not.toBeNull()
    const x = Number(m?.[1]) - 10, y = Number(m?.[2]) + 8   // le nom est posé à (+10, −8) du point de l'astre
    ;(canvas as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {}
    const fire = (type: string) => { const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }); Object.assign(e, { pointerId: 1 }); canvas.dispatchEvent(e) }
    fire('pointerdown'); fire('pointerup')
    expect(state.view).toEqual({ mode: 'earth', selected: 'earth' })
  })
  it('vue Terre dézoomée : un clic sur le nom de la Terre revient près de la Terre (même comportement que Mars)', async () => {
    await new Promise((r) => setTimeout(r, 450))
    for (let i = 0; i < 60; i++) engine.nudge('d+', 15)
    for (let i = 0; i < 40; i++) engine._frame(performance.now() + 1000 + i * 100)
    const terre = [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((e) => e.textContent === 'Terre')
    const m = /translate[(]([-0-9.]+)px,([-0-9.]+)px[)]/.exec(terre?.style.transform ?? '')
    expect(m).not.toBeNull()
    ;(canvas as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {}
    const fire = (type: string) => { const e = new MouseEvent(type, { clientX: Number(m?.[1]) - 10, clientY: Number(m?.[2]) + 8, bubbles: true }); Object.assign(e, { pointerId: 1 }); canvas.dispatchEvent(e) }
    fire('pointerdown'); fire('pointerup')
    for (let i = 0; i < 6; i++) engine._frame(performance.now() + 9000 + i * 100)
    expect(JSON.parse(state.viewJson).altKm).toBeLessThan(1e5)
  })
  it('fiche d’astre : la Terre au départ, la Lune en vue Lune, l’ISS en vue ISS', () => {
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 300 + i * 100)
    expect(state.focus.id).toBe('earth')
    engine.selectView('moon')
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 1000 + i * 100)
    expect(state.focus.id).toBe('moon')
    engine.goIss()
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 2000 + i * 100)
    expect(state.focus.id).toBe('iss')
  })
  it('choisir l’ISS : options allumées d’office (dimensions, trajectoire) et fiche de l’ISS ; une option peut ensuite être éteinte', () => {
    engine._frame(performance.now() + 300)
    expect(state.features).toEqual({})
    engine.goIss()
    expect(state.view).toEqual({ mode: 'iss', selected: null })
    expect(state.features).toEqual({ size: true, orbit: true })
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 1000 + i * 100)
    expect(state.focus.id).toBe('iss')
    engine.setFeature('orbit', false)
    expect(state.features.orbit).toBe(false)
    expect(state.features.size).toBe(true)
  })
  it('l’ISS cachée cache sa trajectoire et ses cotes ; elles reviennent avec elle', () => {
    engine._frame(performance.now() + 300)
    engine.goIss()
    engine._frame(performance.now() + 400)
    expect(engine._featuresVisible()).toEqual({ size: true, orbit: true })
    engine.selectView('sun')   // vue Soleil : l’ISS n’est plus dessinée
    engine._frame(performance.now() + 500)
    expect(engine._featuresVisible()).toEqual({ size: false, orbit: false })
    engine.goIss()
    engine._frame(performance.now() + 600)
    expect(engine._featuresVisible()).toEqual({ size: true, orbit: true })
  })
  it('chaque astre du menu (planètes, lunes, comète, Soleil) se regarde sans erreur et affiche sa fiche de près', async () => {
    await new Promise((r) => setTimeout(r, 450))
    engine._frame(performance.now() + 500)
    const ids = ['mercury', 'venus', 'earth', 'moon', 'sun', 'mars', 'halley', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'amalthea', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton', 'proteus', 'charon']
    let t = 1000
    for (const id of ids) {
      engine.selectView(id)
      for (let i = 0; i < 4; i++) engine._frame(performance.now() + (t += 100))
      expect(state.view.selected, id).toBe(id)
      expect(state.status, id).toBe('ready')
      expect(state.focus.id, id).toBe(id === 'sun' ? null : id)   // le Soleil se regarde de 90 000 unités : trop loin pour sa fiche
    }
  })
  it('les lunes d’une planète ne sont dessinées que près d’elle : cachées en vue Soleil, nom affiché en vue Jupiter', async () => {
    await new Promise((r) => setTimeout(r, 450))
    const label = (text: string) => [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((x) => x.textContent === text)
    engine.selectView('sun')
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 1000 + i * 100)
    expect(label('Io')?.style.display).toBe('none')
    expect(label('Titan')?.style.display).toBe('none')
    engine.selectView('jupiter')
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 2000 + i * 100)
    expect(label('Jupiter')).toBeDefined()
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
