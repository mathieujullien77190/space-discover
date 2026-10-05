import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BodyCard from '@/components/BodyCard'
import IssBadge from '@/components/IssBadge'
import HideUi from '@/components/HideUi'
import ObservatoryCard from '@/components/ObservatoryCard'
import StarInfo from '@/components/StarInfo'
import MapOptions from '@/components/MapOptions'
import MapCredit from '@/components/MapCredit'
import DatePicker from '@/components/DatePicker'
import SubMenu from '@/components/SubMenu'
import TopBar from '@/components/TopBar'
import ViewParams from '@/components/ViewParams'
import { useStore } from '@/store'
import { initialEngineState } from '@/store/initial'
import type { Engine } from '@/types'

const fakeEngine = () => ({ nudge: vi.fn(), alignNorth: vi.fn(), alignOrbit: vi.fn(), resetUp: vi.fn(), selectView: vi.fn(), goIss: vi.fn(), goHubble: vi.fn(), goConcorde: vi.fn(), flyConcorde: vi.fn(), setSimSpeed: vi.fn(), setFeature: vi.fn(), setIssView: vi.fn(), setClouds: vi.fn(), setBorders: vi.fn(), setCapitals: vi.fn(), setObservatories: vi.fn(), setStarInfo: vi.fn(), clearStar: vi.fn(), setConstellations: vi.fn(), setDayNight: vi.fn(), goObservatory: vi.fn(), setObservatoryView: vi.fn(), setRealistic: vi.fn() }) as unknown as Engine & Record<string, ReturnType<typeof vi.fn>>

describe('TopBar + SubMenu', () => {
  let engine: ReturnType<typeof fakeEngine>
  beforeEach(() => {
    engine = fakeEngine()
    useStore.setState({ ...initialEngineState, panel: null, bodyCategory: 'planets', features: {}, engine })
  })
  it('barre du haut : Astres, Terre, ISS, Nuages ; ni Histoires, ni Fusées, ni Satellites, aucun sous-menu au départ', () => {
    render(<><TopBar /><SubMenu /></>)
    for (const l of ['🌌 Astres', '🌍 Terre', '🛰 ISS', '🔭 Hubble', '✈ Concorde', '🎬 Vue réaliste']) expect(screen.getByText(l)).toBeInTheDocument()
    for (const l of [/Histoires/, /Fusées/, /Satellites/, /Engins/]) expect(screen.queryByText(l)).toBeNull()
    expect(screen.queryByText(/Lune/)).toBeNull()
  })
  it('bouton « Terre » : revient à la vue Terre depuis n’importe quelle vue (ISS comprise)', () => {
    useStore.setState({ view: { ...initialEngineState.view, mode: 'iss' }, issView: false })
    render(<TopBar />)
    fireEvent.click(screen.getByText('🌍 Terre'))
    expect(engine.selectView).toHaveBeenCalledWith('earth')
  })
  it('bouton « ISS » : va zoomer sur l’ISS', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByText('🛰 ISS'))
    expect(engine.goIss).toHaveBeenCalled()
  })
  it('bandeau « Vue depuis l’ISS » : le nom de la station en texte', () => {
    useStore.setState({ issView: true })
    render(<IssBadge />)
    expect(screen.getByText(/Vue depuis l’ISS/)).toBeInTheDocument()
  })
  it('menu « Concorde » : un bouton par vol, saute au vol choisi', () => {
    useStore.setState({ ...initialEngineState, panel: null })
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('✈ Concorde'))
    expect(screen.getByText('🛫 AF002 · Paris → New York')).toBeInTheDocument()
    expect(screen.getByText('🛫 AF001 · New York → Paris')).toBeInTheDocument()
    fireEvent.click(screen.getByText('🛫 AF001 · New York → Paris'))
    expect(engine.flyConcorde).toHaveBeenCalledWith('AF001')
    fireEvent.click(screen.getByText('🔎 Voir le Concorde'))
    expect(engine.goConcorde).toHaveBeenCalled()
  })
  it('fiche du Concorde : faits et bouton « Vue depuis le Concorde »', () => {
    useStore.setState({ ...initialEngineState, focus: { id: 'concorde' }, issView: false, cardCollapsed: false })
    render(<BodyCard />)
    expect(screen.getByText('Concorde (Air France)')).toBeInTheDocument()
    expect(screen.getByText('61,66 m')).toBeInTheDocument()
    fireEvent.click(screen.getByText('👁 Vue depuis le Concorde'))
    expect(engine.setIssView).toHaveBeenCalledWith(true)
  })
  it('plus de bandeau en vue depuis un observatoire', () => {
    useStore.setState({ ...initialEngineState, issView: false, observatory: { id: 'pic-du-midi', view: true } })
    const { container } = render(<IssBadge />)
    expect(container.textContent).toBe('')
  })
  it('bouton « Vue depuis l’ISS » : dans la fiche de l’ISS (plus dans la barre du haut)', () => {
    useStore.setState({ ...initialEngineState, focus: { id: 'iss' }, issView: false, cardCollapsed: false })
    render(<><TopBar /><BodyCard /></>)
    expect(screen.getAllByText('👁 Vue depuis l’ISS')).toHaveLength(1)
    fireEvent.click(screen.getByText('👁 Vue depuis l’ISS'))
    expect(engine.setIssView).toHaveBeenCalledWith(true)
  })
  it('plus de bouton « Jour / nuit » : le Soleil réel éclaire toujours (vraie simulation) ; le bloc général reste dans toutes les vues', () => {
    useStore.setState({ ...initialEngineState, view: { ...initialEngineState.view, mode: 'solar', selected: 'mars' } })
    render(<><TopBar /><MapOptions /></>)
    expect(screen.queryByText('🌗 Jour / nuit')).toBeNull()
    expect(screen.getByText('🗺 Options de carte')).toBeInTheDocument()       // devant Mars : le bloc général (étoiles, constellations) reste là
  })
  it('infos étoiles : case à cocher et fiche de l’étoile choisie (Sirius), fermeture', () => {
    useStore.setState({ ...initialEngineState, starInfo: false, star: { hip: null } })
    render(<><MapOptions /><StarInfo /></>)
    expect(screen.queryByText('Sirius')).toBeNull()
    fireEvent.click(screen.getByLabelText('Infos étoiles (clic)'))
    expect(engine.setStarInfo).toHaveBeenCalledWith(true)
    act(() => useStore.setState({ star: { hip: 32349 } }))
    expect(screen.getByText('Sirius')).toBeInTheDocument()
    expect(screen.getByText('Grand Chien')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Fermer la fiche de l’étoile'))
    expect(engine.clearStar).toHaveBeenCalled()
  })
  it('observatoire : fiche avec « Vue depuis l’observatoire »', () => {
    useStore.setState({ ...initialEngineState, observatory: { id: null, view: false }, cardCollapsed: false })
    render(<><TopBar /><ObservatoryCard /></>)
    expect(screen.queryByText('Observatoire du Pic du Midi')).toBeNull()                       // pas de fiche tant qu’on n’y est pas
    act(() => useStore.setState({ observatory: { id: 'pic-du-midi', view: false } }))
    expect(screen.getByText('Observatoire du Pic du Midi')).toBeInTheDocument()
    expect(screen.getByText('2 877 m')).toBeInTheDocument()
    fireEvent.click(screen.getByText('👁 Vue depuis l’observatoire'))
    expect(engine.setObservatoryView).toHaveBeenCalledWith(true)
  })
  it('bouton « Vue réaliste » : retire trajectoires, noms et repères (à la demande)', () => {
    useStore.setState({ realistic: false })
    render(<TopBar />)
    fireEvent.click(screen.getByText('🎬 Vue réaliste'))
    expect(engine.setRealistic).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByText('🎬 Vue réaliste'))
    expect(engine.setRealistic).toHaveBeenLastCalledWith(false)
  })
  it('plus de bouton « Nuages » : les nuages sont toujours actifs (visibles en vue dézoomée)', () => {
    useStore.setState({ clouds: true })
    render(<><TopBar /><MapCredit /></>)
    expect(screen.queryByText('☁ Nuages')).toBeNull()
    expect(screen.getByText(/matteason/)).toBeInTheDocument()                  // crédit tant que les nuages sont visibles
  })
  it('bloc GÉNÉRAL « Options de carte » (bas à gauche) : infos étoiles et constellations, éteintes par défaut', () => {
    useStore.setState({ ...initialEngineState, starInfo: false, constellations: false })
    render(<MapOptions />)
    expect(screen.getByText('🗺 Options de carte')).toBeInTheDocument()
    expect(screen.queryByLabelText('Limites de pays')).toBeNull()               // elles sont dans la fiche de la Terre
    expect((screen.getByLabelText('Constellations') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByLabelText('Infos étoiles (clic)') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByLabelText('Constellations'))
    expect(engine.setConstellations).toHaveBeenLastCalledWith(true)
  })
  it('options de la Terre dans la fiche de la Terre et d’un observatoire : seuls les observatoires sont cochés', () => {
    const d = useStore.getInitialState()
    expect([d.borders, d.capitals, d.observatories]).toEqual([false, false, true])
    useStore.setState({ ...initialEngineState, borders: false, capitals: false, observatories: true, focus: { id: 'earth' }, cardCollapsed: false })
    render(<BodyCard />)
    expect((screen.getByLabelText('Observatoires') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Limites de pays') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByLabelText('Limites de pays'))
    expect(engine.setBorders).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByLabelText('Capitales'))
    expect(engine.setCapitals).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByLabelText('Observatoires'))
    expect(engine.setObservatories).toHaveBeenLastCalledWith(false)
  })
  it('petit œil en haut à gauche : cache l’interface et passe en plein écran, un second clic la remet', () => {
    const request = vi.fn(() => Promise.resolve())
    Object.defineProperty(document.documentElement, 'requestFullscreen', { value: request, configurable: true })
    useStore.setState({ ...initialEngineState, uiHidden: false })
    render(<HideUi />)
    fireEvent.click(screen.getByTitle('Cacher l’interface (plein écran)'))
    expect(useStore.getState().uiHidden).toBe(true)
    expect(request).toHaveBeenCalled()                                         // plein écran (comme F11)
    fireEvent.click(screen.getByTitle('Afficher l’interface'))
    expect(useStore.getState().uiHidden).toBe(false)
    act(() => useStore.setState({ uiHidden: true }))
    document.dispatchEvent(new Event('fullscreenchange'))                      // sortie du plein écran (Échap) : l’interface revient
    expect(useStore.getState().uiHidden).toBe(false)
  })
  it('options de la Terre aussi dans la fiche d’un observatoire', () => {
    useStore.setState({ ...initialEngineState, observatory: { id: 'pic-du-midi', view: false }, cardCollapsed: false })
    render(<ObservatoryCard />)
    expect(screen.getByLabelText('Limites de pays')).toBeInTheDocument()
    expect(screen.getByLabelText('Capitales')).toBeInTheDocument()
    expect(screen.getByLabelText('Observatoires')).toBeInTheDocument()
  })
  it('crédit du relief satellite : affiché seulement quand le relief est visible', () => {
    useStore.setState({ clouds: false, terrainDetail: false })
    const { rerender } = render(<MapCredit />)
    expect(screen.queryByText(/Esri/)).toBeNull()
    act(() => useStore.setState({ terrainDetail: true }))
    rerender(<MapCredit />)
    expect(screen.getByText(/Esri/)).toBeInTheDocument()
    expect(screen.getByText(/AWS Terrain Tiles/)).toBeInTheDocument()
  })
  it('crédit des nuages : affiché seulement quand la couche est active', () => {
    useStore.setState({ clouds: false })
    const { rerender } = render(<MapCredit />)
    expect(screen.queryByText(/matteason/)).toBeNull()
    act(() => useStore.setState({ clouds: true }))
    rerender(<MapCredit />)
    expect(screen.getByText(/matteason/)).toBeInTheDocument()
  })
  it('Astres : la Lune n’est pas une planète : elle apparaît sous la Terre, pas sous Mars', () => {
    render(<SubMenu />)
    act(() => useStore.setState({ panel: 'planets' }))
    expect(screen.getByText(/Terre/)).toBeInTheDocument()
    expect(screen.getByText(/Mars/)).toBeInTheDocument()
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'mars', align: null } }))
    expect(screen.queryByText(/Lune/)).toBeNull()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'moon', align: null } }))
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
  })
  it('Astres : toutes les planètes, et les lunes de la planète choisie sous elle', () => {
    render(<SubMenu />)
    act(() => useStore.setState({ panel: 'planets' }))
    for (const n of ['Mercure', 'Vénus', 'Terre', 'Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton']) expect(screen.getByText(new RegExp(n + "$"))).toBeInTheDocument()
    const moons = (planet: string, names: string[], absent: string[]) => {
      act(() => useStore.setState({ view: { mode: 'solar', selected: planet, align: null } }))
      for (const n of names) expect(screen.getByText(new RegExp(n + "$"))).toBeInTheDocument()
      for (const n of absent) expect(screen.queryByText(new RegExp(n + "$"))).toBeNull()
    }
    moons('mars', ['Phobos', 'Déimos'], ['Io', 'Titan'])
    moons('jupiter', ['Io', 'Europe', 'Ganymède', 'Callisto', 'Amalthée'], ['Phobos', 'Titan'])
    moons('saturn', ['Titan', 'Encelade', 'Japet', 'Rhéa'], ['Io', 'Triton'])
    moons('uranus', ['Miranda', 'Titania', 'Obéron'], ['Titan'])
    moons('neptune', ['Triton', 'Protée'], ['Miranda'])
    moons('pluto', ['Charon'], ['Triton'])
    moons('mercury', [], ['Phobos', 'Io', 'Lune'])
    moons('earth', ['Lune'], ['Phobos'])
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'io', align: null } }))   // une lune choisie : sa fratrie reste affichée
    expect(screen.getByText(/Callisto/)).toBeInTheDocument()
  })
  it('Astres : Planètes et Comètes sont des menus ; le Soleil (un seul astre) est directement un bouton', () => {
    render(<SubMenu />)
    act(() => useStore.setState({ panel: 'planets' }))
    expect(screen.getByText('🪐 Planètes')).toBeInTheDocument()
    expect(screen.queryByText('☀ Étoiles')).toBeNull()   // pas de bouton « Étoiles » puis « Soleil »
    expect(screen.queryByText(/Halley/)).toBeNull()
    fireEvent.click(screen.getByText(/^☀ Soleil$/))
    expect(engine.selectView).toHaveBeenCalledWith('sun')
    fireEvent.click(screen.getByText('☄ Comètes / météorites'))
    fireEvent.click(screen.getByText(/Tchouri/))
    expect(engine.selectView).toHaveBeenCalledWith('tchouri')
    fireEvent.click(screen.getByText(/Halley/))
    expect(engine.selectView).toHaveBeenCalledWith('halley')
  })
  it('Astres : un clic sur la Lune change de vue', () => {
    render(<SubMenu />)
    act(() => useStore.setState({ panel: 'planets' }))
    fireEvent.click(screen.getByText(/Lune/))
    expect(engine.selectView).toHaveBeenCalledWith('moon')
  })
  it('re-cliquer sur le bouton referme le sous-menu', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
    fireEvent.click(screen.getByText('🌌 Astres'))
    expect(screen.queryByText(/Lune/)).toBeNull()
  })
})

describe('DatePicker (saut de date)', () => {
  it('affiche la date UTC ; un clic ouvre le sélecteur ; choisir une date appelle le moteur', () => {
    const engine = fakeEngine()
    ;(engine as unknown as Record<string, unknown>).setDate = vi.fn()
    useStore.setState({ ...initialEngineState, time: { simMs: Date.UTC(2026, 9, 5, 12, 30), speed: 1, visible: true }, engine })
    render(<DatePicker />)
    expect(screen.getByText(/2026.*12:30 UTC/)).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Choisir une date (saut dans le temps)'))
    const input = screen.getByLabelText('Date et heure (UTC)') as HTMLInputElement
    expect(input.value).toBe('2026-10-05T12:30')
    fireEvent.change(input, { target: { value: '1977-08-20T14:29' } })
    expect((engine as unknown as { setDate: ReturnType<typeof vi.fn> }).setDate).toHaveBeenCalledWith(Date.UTC(1977, 7, 20, 14, 29))
  })
})

describe('ViewParams (juste au-dessus de la barre d’échelle)', () => {
  it('affiche le JSON de la vue, règle la vue avec le pas choisi et copie', () => {
    const engine = fakeEngine()
    useStore.setState({ ...initialEngineState, viewJson: '{"mode":"earth","lon":2,"lat":30,"altKm":15000,"fov":50}', nudgeStep: 1, engine })
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ViewParams />)
    expect(screen.getByText(/"mode":"earth"/)).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByText('◀'))
    fireEvent.pointerUp(screen.getByText('◀'))
    expect(engine.nudge).toHaveBeenCalledWith('y-', 1)
    fireEvent.click(screen.getByText('1°'))   // pas suivant : 5°
    fireEvent.pointerDown(screen.getByText('▲'))
    fireEvent.pointerUp(screen.getByText('▲'))
    expect(engine.nudge).toHaveBeenLastCalledWith('p+', 5)
    fireEvent.click(screen.getByText('📋 Copier'))
    expect(writeText).toHaveBeenCalledWith('{"mode":"earth","lon":2,"lat":30,"altKm":15000,"fov":50}')
  })
})

describe('BodyCard (fiche de l’astre proche)', () => {
  it('réductible en mini bouton-icône (mémorisé), un clic la rouvre', () => {
    localStorage.removeItem('cardCollapsed')
    useStore.setState({ ...initialEngineState, focus: { id: 'mars' }, cardCollapsed: false })
    render(<BodyCard />)
    expect(screen.getByRole('heading', { name: 'Mars' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réduire la fiche' }))
    expect(screen.queryByRole('heading', { name: 'Mars' })).toBeNull()   // plus de fiche : seulement l’icône
    expect(localStorage.getItem('cardCollapsed')).toBe('1')
    const mini = screen.getByRole('button', { name: 'Afficher la fiche : Mars' })
    expect(mini.querySelector('img')?.getAttribute('src')).toBe('/objects/mars/card.png')   // l’icône est l’illustration de l’astre
    act(() => useStore.setState({ focus: { id: 'jupiter' } }))
    expect(screen.getByRole('button', { name: 'Afficher la fiche : Jupiter' })).toBeInTheDocument()   // l’icône suit l’astre choisi
    fireEvent.click(screen.getByRole('button', { name: 'Afficher la fiche : Jupiter' }))
    expect(screen.getByRole('heading', { name: 'Jupiter' })).toBeInTheDocument()
    expect(localStorage.getItem('cardCollapsed')).toBe('0')
  })
  it('boutons « Nord en haut » et « Orbite à plat » : appellent le moteur avec l’astre de la fiche ; pas pour l’ISS ni le Soleil (orbite)', () => {
    const engine = fakeEngine()
    useStore.setState({ ...initialEngineState, focus: { id: 'jupiter' }, view: { mode: 'solar', selected: 'jupiter', align: null }, engine })
    const { unmount } = render(<BodyCard />)
    fireEvent.click(screen.getByText('🧭 Nord en haut'))
    expect(engine.alignNorth).toHaveBeenCalledWith('jupiter')
    fireEvent.click(screen.getByText('↔ Orbite à plat'))
    expect(engine.alignOrbit).toHaveBeenCalledWith('jupiter')
    // boutons à bascule : activés, un nouveau clic revient en arrière (Nord en haut → verticale du monde ; Orbite à plat → Nord en haut)
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'jupiter', align: 'north' } }))
    expect(screen.getByText('🧭 Nord en haut').className).toMatch(/_on_/)
    expect(screen.getByText('↔ Orbite à plat').className).not.toMatch(/_on_/)
    fireEvent.click(screen.getByText('🧭 Nord en haut'))
    expect(engine.resetUp).toHaveBeenCalled()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'jupiter', align: 'orbit' } }))
    expect(screen.getByText('↔ Orbite à plat').className).toMatch(/_on_/)
    fireEvent.click(screen.getByText('↔ Orbite à plat'))
    expect(engine.alignNorth).toHaveBeenCalledTimes(2)
    unmount()
    act(() => useStore.setState({ focus: { id: 'iss' } }))
    render(<BodyCard />)
    expect(screen.queryByText('🧭 Nord en haut')).toBeNull()
    expect(screen.queryByText('↔ Orbite à plat')).toBeNull()
  })
  it('ISS : orbite calculée (altitude, période, inclinaison) et faits du JSON', () => {
    useStore.setState({ ...initialEngineState, focus: { id: 'iss' } })
    render(<BodyCard />)
    expect(screen.getByText('Station spatiale')).toBeInTheDocument()
    expect(screen.getByText(/93 min/)).toBeInTheDocument()
    expect(screen.getByText('51,6°')).toBeInTheDocument()
    expect(screen.getByText('109 × 73 m')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'ISS' }).getAttribute('src')).toBe('/objects/iss/card.png')
  })
  it('rien quand on n’est proche d’aucun astre', () => {
    useStore.setState({ ...initialEngineState, focus: { id: null } })
    const { container } = render(<BodyCard />)
    expect(container).toBeEmptyDOMElement()
  })
  it('Mars : illustration, diamètre, gravité calculée et faits du JSON', () => {
    useStore.setState({ ...initialEngineState, focus: { id: 'mars' } })
    render(<BodyCard />)
    expect(screen.getByRole('heading', { name: 'Mars' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mars' }).getAttribute('src')).toBe('/objects/mars/card.png')
    expect(screen.getByText('6 779 km')).toBeInTheDocument()
    expect(screen.getByText('3,73 m/s²')).toBeInTheDocument()
    expect(screen.getByText('24 h 37 min')).toBeInTheDocument()
    expect(screen.getByText('2 (Phobos et Déimos)')).toBeInTheDocument()
  })
})
