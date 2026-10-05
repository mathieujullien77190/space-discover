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
  it('vue depuis l’ISS : caméra sur la station, tête vers le haut, coupée par un changement de vue', () => {
    engine.resetTime(); engine._frame(performance.now() + 350)               // la date a pu être changée par un test précédent (l’ISS n’existe qu’à partir de 1998)
    engine.setIssView(true)
    for (let i = 0; i < 5; i++) engine._frame(performance.now() + 400 + i * 100)
    const fp = engine._fp()!
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    expect(fp.posErr!).toBeLessThan(1)
    expect(dot(fp.up, fp.radial!)).toBeGreaterThan(0.5)
    engine.selectView('moon'); engine._frame(performance.now() + 1500)
    expect(engine._fp()).toBeNull()
    engine.goIss(); engine._frame(performance.now() + 1700)                          // le bouton « ISS » zoome sur la station
    expect(engine._fp()).toBeNull()
  })
  it('nuages : option prise en compte (rien n’est chargé tant qu’elle est éteinte)', () => {
    engine._frame(performance.now() + 100)
    expect(engine._clouds()).toMatchObject({ on: false, state: null, visible: false })
    engine.setClouds(true); engine._frame(performance.now() + 200)
    expect(engine._clouds().on).toBe(true)
    engine.setClouds(false); engine._frame(performance.now() + 300)
    expect(engine._clouds().visible).toBe(false)
  })
  it('options de carte : limites de pays et capitales éteintes par défaut, affichées à la demande', () => {
    engine.selectView('earth'); engine._frame(performance.now() + 100)
    expect(engine._mapOptions()).toMatchObject({ borders: false, capitals: 0, constellations: false, dayNight: false, sunPoint: false })
    engine.setBorders(true); engine.setCapitals(true); engine.setConstellations(true); engine.setDayNight(true)
    engine._frame(performance.now() + 200)
    const on = engine._mapOptions()
    expect(on.borders).toBe(true)
    expect(on.capitals).toBeGreaterThan(5)                                     // vue de départ : l’Europe en face, plusieurs capitales visibles
    const names = [...overlay.querySelectorAll<HTMLElement>('.eng-l3d.cap')].filter((e) => e.style.display === 'block').map((e) => e.textContent)
    expect(names.some((t) => /Paris/.test(t ?? ''))).toBe(true)
    expect(on.constellations).toBe(true)
    expect(on.constellationNames).toBeGreaterThan(0)                           // au moins un nom de constellation à l’écran autour de la Terre
    expect(on.dayNight && on.sunPoint).toBe(true)                              // jour / nuit : le vrai Soleil éclaire, l’ambiance est sombre
    expect(on.ambient).toBeLessThan(0.1)
    engine.setBorders(false); engine.setCapitals(false); engine.setConstellations(false); engine.setDayNight(false)
    engine._frame(performance.now() + 300)
    expect(engine._mapOptions()).toMatchObject({ borders: false, capitals: 0, constellations: false, constellationNames: 0, dayNight: false, sunPoint: false })
    expect(engine._mapOptions().ambient).toBeGreaterThan(0.5)                  // retour à l’éclairage « de face »
  })
  it('règle la vitesse du temps', () => {
    engine.setSimSpeed(3600)
    expect(state.time.speed).toBe(3600)
    engine.resetTime()
    expect(state.time.speed).toBe(1)
  })
  it('les étiquettes 3D vivent dans le conteneur fourni et sont retirées à l’arrêt du moteur', () => {
    expect(overlay.querySelectorAll('.eng-l3d').length).toBeGreaterThan(0)
    engine.dispose()
    expect(overlay.querySelectorAll('.eng-l3d').length).toBe(0)
  })
})
