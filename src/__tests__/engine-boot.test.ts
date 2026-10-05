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
    const e = createEngine({ canvas, overlay, publish: (p: EnginePatch) => { state = { ...state, ...mergePatch(state, p) } }, createRenderer: fakeRenderer, showProbes: true })
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
    expect(state.view).toMatchObject({ mode: 'solar', selected: 'moon' })
    engine.goIss()
    expect(state.view).toMatchObject({ mode: 'iss', selected: null })
    engine.selectView('earth')
    expect(state.view).toMatchObject({ mode: 'earth', selected: 'earth' })
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
    expect(state.view).toMatchObject({ mode: 'earth', selected: 'earth' })
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
    expect(state.view).toMatchObject({ mode: 'iss', selected: null })
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
    const ids = ['mercury', 'venus', 'earth', 'moon', 'sun', 'mars', 'halley', 'tchouri', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'amalthea', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton', 'proteus', 'charon']
    let t = 1000
    for (const id of ids) {
      engine.selectView(id)
      for (let i = 0; i < 4; i++) engine._frame(performance.now() + (t += 100))
      expect(state.view.selected, id).toBe(id)
      expect(state.status, id).toBe('ready')
      expect(state.focus.id, id).toBe(id)   // la fiche de l’astre choisi s’affiche toujours, même le Soleil regardé de 90 000 unités
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
  it('zoom arrière sans limite pratique : plus loin que la distance de Neptune, toujours sans erreur', () => {
    engine._frame(performance.now() + 300)
    for (let i = 0; i < 90; i++) engine.nudge('d+', 15)   // ×1,35 par appel : bien au-delà de l’ancienne limite (3 × 10⁶ rayons terrestres)
    for (let i = 0; i < 60; i++) engine._frame(performance.now() + 1000 + i * 100)
    expect(state.status).toBe('ready')
    expect(JSON.parse(state.viewJson).altKm).toBeGreaterThan(3e6 * 6378)
  })
  it('vue Terre très dézoomée : Mars, sa trace et son nom restent affichés (seule une lune est masquée par sa planète)', async () => {
    await new Promise((r) => setTimeout(r, 450))
    engine._frame(performance.now() + 300)
    for (let i = 0; i < 48; i++) engine.nudge('d+', 15)   // ≈ 4 × 10⁶ rayons terrestres : Mars et la Terre ne sont qu’à quelques pixels l’une de l’autre
    for (let i = 0; i < 60; i++) engine._frame(performance.now() + 1000 + i * 100)
    const label = (text: string) => [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((x) => x.textContent === text)
    expect(label('Mars')?.style.display).toBe('block')
    expect(label('Terre')?.style.display).toBe('block')
    expect(label('Lune')?.style.display).toBe('none')
    expect(engine._orbitsVisible().mars).toBe(true)
  })
  it('lunes affichées : le nom de la planète est caché et sa fiche est affichée en haut', async () => {
    await new Promise((r) => setTimeout(r, 450))
    engine.selectView('jupiter')
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 1000 + i * 100)
    ;(canvas as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {}
    for (let i = 0; i < 14; i++) canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, cancelable: true }))   // recul de la caméra : 62 → ≈ 2 500 unités (Jupiter : 11 rayons)
    for (let i = 0; i < 40; i++) engine._frame(performance.now() + 2000 + i * 100)
    const label = (text: string) => [...overlay.querySelectorAll<HTMLElement>('.eng-l3d')].find((x) => x.textContent === text)
    expect(label('Callisto')?.style.display).toBe('block')
    expect(label('Jupiter')?.style.display).toBe('none')
    expect(state.focus.id).toBe('jupiter')
    engine.selectView('sun')   // loin de Jupiter : ses lunes disparaissent, son nom revient
    for (let i = 0; i < 6; i++) engine._frame(performance.now() + 9000 + i * 100)
    expect(label('Callisto')?.style.display).toBe('none')
  })
  it('niveaux de détail : la Terre et les sphères d’astres s’allègent quand elles sont petites à l’écran', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    frames(4)
    expect(engine._lod().earth).toBeGreaterThan(0)   // vue de départ : 512 × 256 suffit (au lieu du million de triangles)
    engine.selectView('sun'); frames(4)
    expect(engine._lod().earth).toBe(4)   // la Terre est un point
    const far = engine._lod().bodies
    expect(far.jupiter).toBe(-1)          // Jupiter fait moins d’un pixel : maillage masqué, son point lointain suffit
    expect(far.moon).toBe(-1)
    engine.selectView('jupiter'); frames(6)
    const near = engine._lod().bodies
    expect(near.jupiter).toBeLessThanOrEqual(1)   // de près (≈ 150 px de rayon) : géométrie fine ou moyenne, jamais masquée
    expect(near.mars).toBe(-1)
    engine.selectView('earth'); frames(4)
    for (let i = 0; i < 30; i++) engine.nudge('d-', 15)   // on descend vers le sol
    frames(30)
    expect(engine._lod().earth).toBe(0)   // près du sol : 1024 × 512
  })
  it('résolution adaptative : baisse quand les images sont lentes, remonte quand elles sont rapides', () => {
    let t = 5e6
    expect(engine._lod().ratio).toBe(1)
    for (let i = 0; i < 200; i++) engine._frame(t += 50)   // 20 images par seconde
    const slow = engine._lod().ratio
    expect(slow).toBeLessThan(1)
    expect(slow).toBeGreaterThanOrEqual(0.75)
    for (let i = 0; i < 2500; i++) engine._frame(t += 8)   // 125 images par seconde
    expect(engine._lod().ratio).toBeGreaterThan(slow)
  })
  it('trace locale : près d’un astre sa trajectoire passe pile par son centre (double précision), loin c’est l’orbite complète', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    for (const id of ['tchouri', 'pluto', 'neptune', 'mars', 'earth', 'triton']) {
      engine.selectView(id); frames(4)
      const l = engine._localOrbit(id)!
      expect(l, id).not.toBeNull()
      if (id === 'earth') continue   // en vue Terre la caméra est au centre : la trace locale n’est pas dessinée
      expect(l.visible, id).toBe(true)
      expect(l.coarse, id).toBe(false)           // la grosse ellipse (32 bits) est masquée, elle manquerait l’astre
      expect(l.n, id).toBe(513)
      expect(l.mid, id).toEqual([0, 0, 0])        // le sommet du milieu EST l’astre
      expect(Math.hypot(...l.end), id).toBeGreaterThan(0)   // et la ligne s’en éloigne de part et d’autre
    }
    engine.selectView('sun'); frames(4)
    const far = engine._localOrbit('mars')!
    expect(far.visible).toBe(false)
    expect(far.coarse).toBe(true)
  })
  it('nord et équateur : repère affiché près des planètes et lunes ; « Nord en haut » et « Orbite à plat » orientent la caméra', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    frames(4)
    expect(engine._axisVisible().earth).toBe(true)   // vue de départ : la Terre, regardée de 3,4 rayons
    engine.selectView('jupiter'); frames(4)
    const vis = engine._axisVisible()
    expect(vis.jupiter).toBe(true)
    expect(vis.mars).toBe(false)
    expect(vis.earth).toBe(false)
    expect(Object.keys(vis).length).toBeGreaterThan(30)   // planètes et lunes ont leur repère (pas le Soleil ni les comètes)
    // « Nord en haut » : le « haut » de l'écran est le pôle nord de Jupiter (α = 268,06°, δ = 64,50°) et la caméra est un peu au-dessus de l'équateur
    engine.alignNorth('jupiter'); frames(3)
    const a = 268.056595 * Math.PI / 180, d = 64.495303 * Math.PI / 180, eq = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)], pole = [eq[0], eq[2], -eq[1]]
    const v = engine._view(), dot = (x: number[], y: number[]) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2]
    expect(v.custom).toBe(true)
    expect(dot(v.up, pole)).toBeGreaterThan(0.999999)
    expect(dot(v.dir, v.up)).toBeCloseTo(0.3 / Math.sqrt(1.09), 3)
    // « Orbite à plat » : le « haut » est la normale de l'orbite d'Io autour de Jupiter, la caméra 12° au-dessus du plan
    engine.selectView('io'); frames(3)
    expect(engine._view().align).toBe('north')   // choisir un astre : « Nord en haut » d'office (celui de Jupiter pour une lune en rotation synchrone)
    engine.alignOrbit('io'); frames(3)
    const w = engine._view()
    expect(w.custom).toBe(true)
    expect(dot(w.dir, w.up)).toBeCloseTo(Math.sin(12 * Math.PI / 180), 3)
    // la Terre : sa trajectoire autour du Soleil
    engine.selectView('earth'); frames(3)
    engine.alignOrbit('earth'); frames(3)
    expect(engine._view().custom).toBe(true)
    engine.alignNorth('earth'); frames(3)
    expect(engine._view().up[1]).toBeGreaterThan(0.999)   // le pôle nord de la Terre est l'axe y de la scène
  })
  it('après « Nord en haut », glisser à la souris tourne AUTOUR de l’axe choisi : plus de saut vers l’ancienne vue', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    ;(canvas as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {}
    const fire = (type: string, x: number, y: number) => { const ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }); Object.assign(ev, { pointerId: 1 }); canvas.dispatchEvent(ev) }
    const drag = (dx: number, dy: number) => { fire('pointerdown', 300, 300); fire('pointermove', 300 + dx / 2, 300 + dy / 2); fire('pointermove', 300 + dx, 300 + dy); fire('pointerup', 300 + dx, 300 + dy) }
    const dot = (x: number[], y: number[]) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2]
    engine.selectView('jupiter'); frames(4)
    engine.alignNorth('jupiter'); frames(3)
    const before = engine._view()
    drag(120, 0); frames(3)   // glisser horizontalement
    const h = engine._view()
    expect(h.custom).toBe(true)                                       // le « haut » choisi est conservé (pas de remise à la verticale du monde)
    expect(h.up).toEqual(before.up)
    expect(dot(h.dir, h.up)).toBeCloseTo(dot(before.dir, before.up), 6)   // même hauteur au-dessus de l’équateur : on a tourné autour du pôle
    expect(dot(h.dir, before.dir)).toBeLessThan(0.99)                  // et la caméra a bien bougé
    drag(0, 60); frames(3)    // glisser verticalement
    const v = engine._view()
    expect(v.custom).toBe(true)
    expect(dot(v.dir, v.up)).not.toBeCloseTo(dot(h.dir, h.up), 2)       // la hauteur change
    engine.selectView('saturn'); frames(3)
    expect(engine._view().align).toBe('north')                         // un changement de vue : nouvel astre, « Nord en haut » d'office (celui de Saturne)
    engine.resetUp(); frames(2)
    expect(engine._view().custom).toBe(false)                          // bouton « Nord en haut » désactivé : « haut » du monde
    expect(engine._view().align).toBeNull()
  })
  it('le point lointain (carré) disparaît quand le modèle 3D est visible (Halley, Tchouri, planètes) et revient de loin', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    for (const id of ['halley', 'tchouri', 'mars', 'jupiter']) {
      engine.selectView(id); frames(4)
      expect(engine._dotVisible()[id], id).toBe(false)   // de près : pas de carré par-dessus le modèle
    }
    engine.selectView('sun'); frames(4)
    const far = engine._dotVisible()
    expect(far.halley).toBe(true)   // de loin le maillage est invisible : le point reste le repère
    expect(far.mars).toBe(true)
  })
  it('vue de départ : la Terre vue du nord, nord en haut, Greenwich en face ; choisir un astre active « Nord en haut »', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    frames(4)
    const v = engine._view()
    expect(state.view.align).toBe('north')
    expect(v.dir[0]).toBeGreaterThan(0.6)                     // 50° N, 0° E : x = cos(50°) = 0,64 (vers Greenwich), y = sin(50°) = 0,77 (au nord)
    expect(v.dir[1]).toBeCloseTo(Math.sin(50 * Math.PI / 180), 2)
    expect(Math.abs(v.dir[2])).toBeLessThan(0.02)             // sur le méridien 0°
    expect(v.up[1]).toBeGreaterThan(0.99)                     // nord en haut
    for (const id of ['mars', 'jupiter', 'io', 'neptune', 'moon']) { engine.selectView(id); frames(2); expect(state.view.align, id).toBe('north'); expect(engine._view().custom, id).toBe(true) }
    engine.selectView('sun'); frames(2)
    expect(state.view.align).toBeNull()                        // le Soleil n'a pas de pôle connu : pas d'alignement
    engine.selectView('earth'); frames(2)
    expect(state.view.align).toBe('north')
    engine.alignOrbit('earth'); frames(2)
    expect(state.view.align).toBe('orbit')
  })
  it('saut de date : l’ISS n’existe qu’à partir de 1998 ; les astres suivent la date', () => {
    engine._frame(performance.now() + 300)
    engine.setDate(Date.UTC(1990, 5, 1, 12))
    engine._frame(performance.now() + 400)
    expect(state.time.simMs).toBe(Date.UTC(1990, 5, 1, 12))
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 500 + i * 100)
    expect(state.info).toMatch(/ISS : pas encore lancée à cette date [(]premier module : 1998[)]/)
    engine.goIss()   // pas d'ISS : rien ne se passe, on reste en vue Terre
    expect(state.view.mode).toBe('earth')
    engine.setDate(Date.UTC(2005, 5, 1, 12))
    for (let i = 0; i < 4; i++) engine._frame(performance.now() + 1000 + i * 100)
    expect(state.info).toMatch(/ISS : [0-9]/)
    expect(state.info).toMatch(/hors de la période du TLE : position de l'ISS indicative/)
    engine.goIss()
    expect(state.view.mode).toBe('iss')
  })
  it('sondes rejouées : position calculée à la date, vue de la sonde, absentes avant leur lancement', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    frames(4)
    // aujourd'hui : Voyager 1 est à ≈ 168 UA du Soleil (1 UA = 23 455 rayons terrestres)
    const sunDist = (id: string) => { const q = engine._probe(id)!; return Math.hypot(...(q.r as number[])) / 149597870700 }
    expect(sunDist('voyager1')).toBeGreaterThan(150)
    expect(sunDist('voyager1')).toBeLessThan(185)
    expect(sunDist('newhorizons')).toBeGreaterThan(55)
    expect(sunDist('newhorizons')).toBeLessThan(70)
    engine.selectView('voyager2'); frames(4)
    expect(state.view).toMatchObject({ mode: 'solar', selected: 'voyager2' })
    expect(state.focus.id).toBe('voyager2')
    expect(state.info).toMatch(/Voyager 2 : [0-9]+,[0-9] UA du Soleil · [0-9]+,[0-9] km[/]s/)
    const q = engine._probe('voyager2')!
    expect(q.shown).toBe(true)
    expect(q.model).toBe(true)      // vue de la sonde (127 m) : son modèle 3D à l'échelle réelle (antenne de 3,7 m ≈ 24 px)
    expect(q.dot).toBe(false)
    expect(q.local).toBe(true)      // trace locale en double précision, passant par la sonde
    expect(Math.abs(q.dist / q.camDist - 1)).toBeLessThan(0.01)   // la caméra est CENTRÉE sur la sonde à chaque image (16 km/s = 260 m par image : une caméra en retard d'une image la décentrerait)
    engine.selectView('sun'); frames(4)
    const far = engine._probe('voyager2')!
    expect(far.dot).toBe(true)      // de loin : un point (le modèle ferait un millionième de pixel)
    expect(far.model).toBe(false)
    expect(far.path).toBe(true)     // et sa trajectoire entière
    engine.selectView('voyager2'); frames(4)
    // saut de date : en 1975 Voyager n'est pas encore parti, Pioneer 10 est en route
    engine.setDate(Date.UTC(1975, 0, 1)); frames(3)
    expect(engine._probe('voyager1')!.shown).toBe(false)
    expect(engine._probe('voyager1')!.label).toBe('none')
    expect(engine._probe('pioneer10')!.shown).toBe(true)
    // 1979-07-09 : Voyager 2 passe près de Jupiter
    engine.setDate(Date.UTC(1979, 6, 9, 22, 29)); frames(3)
    const near = engine._probe('voyager2')!, jupiter = engine._probeDistance('voyager2', 'jupiter')
    expect(jupiter).toBeLessThan(1e6 * 1.2)   // moins de 1,2 million de km de Jupiter (périgée ≈ 0,69 million)
    expect(near.shown).toBe(true)
  })
  it('lancer Voyager 2 : saut à la date historique, fusée lancée à cette date ; « suivre la sonde » : 2 jours plus tard, sonde en vue, temps accéléré', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    frames(4)
    await engine.launchMission('voyager2')
    const launch = Date.UTC(1977, 7, 20, 14, 29)
    expect(Math.abs(state.time.simMs - launch)).toBeLessThan(60000)   // saut de date : 20 août 1977, 14 h 29 UTC
    expect(state.rocket.running).toBe(true)
    expect(state.rocket.mission).toBe('voyager2')
    expect(state.view.mode).toBe('launch')
    frames(2)
    expect(engine._probe('voyager2')!.shown).toBe(false)   // pendant le lancement c'est la fusée qui est simulée, pas la sonde rejouée
    engine.followMission(); frames(4)
    expect(state.rocket.running).toBe(false)
    expect(state.rocket.mission).toBeNull()
    expect(Math.abs(state.time.simMs - (launch + 2 * 86400000))).toBeLessThan(3600000)   // (le temps a déjà commencé à filer à 1 jour par seconde)
    expect(state.time.speed).toBe(86400)
    expect(state.view).toMatchObject({ mode: 'solar', selected: 'voyager2' })
    expect(engine._probe('voyager2')!.shown).toBe(true)
    // un an plus tard, la sonde est loin de la Terre (Jupiter n'est atteint qu'en 1979)
    engine.setDate(launch + 365 * 86400000); frames(3)
    expect(engine._probe('voyager2')!.r).not.toBeNull()
  })
  it('mode histoire : saut à la date, pause à chaque étape, « Suivant » relance jusqu’à la suivante, fin et sortie', async () => {
    await new Promise((r) => setTimeout(r, 450))
    let t = 1000
    const frames = (n: number) => { for (let i = 0; i < n; i++) engine._frame(performance.now() + (t += 100)) }
    frames(3)
    await engine.startStory('laika')
    frames(2)
    expect(state.story).toMatchObject({ active: true, id: 'laika', index: 0, phase: 'showing', canNext: true, finished: false })
    expect(state.story.step?.at).toBe('before')
    expect(Math.abs(state.time.simMs - Date.UTC(1957, 10, 3, 2, 30, 42))).toBeLessThan(120000)   // saut dans le temps : 3 novembre 1957
    expect(engine._story()).toMatchObject({ playing: false, T: 0 })           // en pause, rien n'a bougé
    engine.storyNext(); frames(1)                                              // étape suivante : le décollage, affichée tout de suite (T = 0)
    expect(state.story.step?.at).toBe('t0')
    expect(state.story.phase).toBe('showing')
    expect(engine._story()?.playing).toBe(false)
    engine.storyNext(); frames(1)                                              // la simulation repart
    expect(state.story.phase).toBe('running')
    expect(engine._story()?.playing).toBe(true)
    for (let i = 0; i < 800 && state.story.phase === 'running'; i++) frames(1)   // jusqu'à la mise en orbite
    expect(state.story.phase).toBe('showing')                                   // pause à l'étape suivante
    expect(state.story.step?.at).toBe('objectOrbit')
    const s = engine._story()!
    expect(s.T).toBeGreaterThanOrEqual(s.trig[2] - 1e-6)
    expect(s.T).toBeLessThan(s.trig[2] + 40)                                    // la pause tombe juste après l'événement (pas 5 minutes plus tard)
    engine.storyNext(); frames(1)                                              // dernière étape passée : histoire finie
    expect(state.story.finished).toBe(true)
    engine.quitStory(); frames(2)
    expect(state.story.active).toBe(false)
    expect(state.rocket.running).toBe(false)
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
