import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BodyCard from '@/components/BodyCard'
import DatePicker from '@/components/DatePicker'
import RocketControls from '@/components/RocketControls'
import SubMenu from '@/components/SubMenu'
import TopBar from '@/components/TopBar'
import ViewParams from '@/components/ViewParams'
import { useStore } from '@/store'
import { initialEngineState } from '@/store/initial'
import type { Engine } from '@/types'

const fakeEngine = () => ({ nudge: vi.fn(), alignNorth: vi.fn(), alignOrbit: vi.fn(), resetUp: vi.fn(), selectView: vi.fn(), goIss: vi.fn(), startRocket: vi.fn(() => Promise.resolve()), stopRocket: vi.fn(), setSimSpeed: vi.fn(), setFeature: vi.fn(), setRocketSpeed: vi.fn() }) as unknown as Engine & Record<string, ReturnType<typeof vi.fn>>

describe('TopBar + SubMenu', () => {
  let engine: ReturnType<typeof fakeEngine>
  beforeEach(() => {
    engine = fakeEngine()
    useStore.setState({ ...initialEngineState, panel: null, bodyCategory: 'planets', features: {}, engine })
  })
  it('un seul bouton en haut (Astres) : Satellites et Fusées sont retirés de l’interface, aucun sous-menu au départ', () => {
    render(<><TopBar /><SubMenu /></>)
    expect(screen.getByText('🌌 Astres')).toBeInTheDocument()
    expect(screen.queryByText('🛰 Satellites')).toBeNull()
    expect(screen.queryByText('🚀 Fusées')).toBeNull()
    expect(screen.queryByText(/Lune/)).toBeNull()
  })
  it('Astres : la Lune n’est pas une planète : elle apparaît sous la Terre, pas sous Mars', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
    expect(screen.getByText(/Terre/)).toBeInTheDocument()
    expect(screen.getByText(/Mars/)).toBeInTheDocument()
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'mars', align: null } }))
    expect(screen.queryByText(/Lune/)).toBeNull()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'moon', align: null } }))
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
  })
  it('Astres : toutes les planètes, et les lunes de la planète choisie sous elle', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
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
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
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
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
    fireEvent.click(screen.getByText(/Lune/))
    expect(engine.selectView).toHaveBeenCalledWith('moon')
  })
  it('Satellites : l’ISS et les sondes ; un objet pas encore lancé à la date choisie est grisé', () => {
    render(<><TopBar /><SubMenu /></>)
    act(() => useStore.setState({ panel: 'satellites' }))   // panneau conservé dans le code, plus de bouton
    for (const n of ['ISS', 'Voyager 1', 'Voyager 2', 'Pioneer 10', 'Pioneer 11', 'New Horizons']) expect(screen.getByText('🛰 ' + n)).toBeInTheDocument()
    expect(screen.getByText('🛰 New Horizons')).toBeEnabled()   // date de départ : maintenant
    act(() => useStore.setState({ time: { simMs: Date.UTC(1975, 0, 1), speed: 1, visible: true } }))
    expect(screen.getByText('🛰 ISS')).toBeDisabled()           // pas d'ISS en 1975
    expect(screen.getByText('🛰 Voyager 2')).toBeDisabled()     // Voyager 2 : 1977
    expect(screen.getByText('🛰 Pioneer 10')).toBeEnabled()     // Pioneer 10 : 1972
    fireEvent.click(screen.getByText('🛰 Pioneer 10'))
    expect(engine.selectView).toHaveBeenCalledWith('pioneer10')
    act(() => useStore.setState({ time: { simMs: Date.UTC(1999, 0, 1), speed: 1, visible: true } }))
    expect(screen.getByText('🛰 ISS')).toBeEnabled()            // ISS : novembre 1998
  })
  it('Satellites : seulement le bouton de l’ISS (plus de boutons Dimensions ni Trajectoire)', () => {
    render(<><TopBar /><SubMenu /></>)
    act(() => useStore.setState({ panel: 'satellites' }))   // panneau conservé dans le code, plus de bouton
    expect(screen.getByText(/ISS/)).toBeInTheDocument()
    expect(screen.queryByText(/Dimensions/)).toBeNull()
    expect(screen.queryByText(/Trajectoire/)).toBeNull()
  })
  it('Satellites : l’ISS mène à la vue ISS', () => {
    render(<><TopBar /><SubMenu /></>)
    act(() => useStore.setState({ panel: 'satellites' }))   // panneau conservé dans le code, plus de bouton
    fireEvent.click(screen.getByText(/ISS/))
    expect(engine.goIss).toHaveBeenCalled()
  })
  it('Fusées : un clic sur une fusée la lance', () => {
    render(<><TopBar /><SubMenu /></>)
    act(() => useStore.setState({ panel: 'rockets' }))   // panneau conservé dans le code, plus de bouton
    fireEvent.click(screen.getByText(/Ariane 5/))
    expect(engine.startRocket).toHaveBeenCalledWith('obj:ariane5')
  })
  it('Fusées en vol : Arrêter et vitesses remplacent la liste', () => {
    useStore.setState({ panel: 'rockets', rocket: { ...initialEngineState.rocket, running: true, T: 130, playing: true, speed: 5 } })
    render(<SubMenu />)
    fireEvent.click(screen.getByText('⏹ Arrêter'))
    expect(engine.stopRocket).toHaveBeenCalled()
    expect(screen.getByText('T+2:10')).toBeInTheDocument()
    expect(screen.queryByText(/Ariane 5/)).toBeNull()
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

describe('Missions historiques (menu Fusées)', () => {
  it('« 🚀 Voyager 2 — 20 août 1977 » lance la mission ; en vol, « Suivre la sonde » apparaît', () => {
    const engine = fakeEngine()
    ;(engine as unknown as Record<string, unknown>).launchMission = vi.fn(() => Promise.resolve())
    ;(engine as unknown as Record<string, unknown>).followMission = vi.fn()
    useStore.setState({ ...initialEngineState, panel: 'rockets', engine })
    const { unmount } = render(<SubMenu />)
    fireEvent.click(screen.getByText(/Voyager 2 — 20 août 1977/))
    expect((engine as unknown as { launchMission: ReturnType<typeof vi.fn> }).launchMission).toHaveBeenCalledWith('voyager2')
    unmount()
    act(() => useStore.setState({ rocket: { ...initialEngineState.rocket, running: true, mission: 'voyager2', T: 10, playing: true, speed: 1 } }))
    render(<SubMenu />)
    fireEvent.click(screen.getByText('🛰 Suivre la sonde'))
    expect((engine as unknown as { followMission: ReturnType<typeof vi.fn> }).followMission).toHaveBeenCalled()
  })
})

describe('RocketControls (feuille : uniquement des props)', () => {
  it('appelle onSpeed et surligne la vitesse courante', () => {
    const onSpeed = vi.fn()
    render(<RocketControls T={0} playing speed={20} onSpeed={onSpeed} onStop={() => {}} />)
    fireEvent.click(screen.getByText('×60'))
    expect(onSpeed).toHaveBeenCalledWith(60)
    expect(screen.getByText('×20').className).toMatch(/on/)
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
