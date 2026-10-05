import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BodyCard from '@/components/BodyCard'
import IssBadge from '@/components/IssBadge'
import MapOptions from '@/components/MapOptions'
import MapCredit from '@/components/MapCredit'
import DatePicker from '@/components/DatePicker'
import SubMenu from '@/components/SubMenu'
import TopBar from '@/components/TopBar'
import ViewParams from '@/components/ViewParams'
import { useStore } from '@/store'
import { initialEngineState } from '@/store/initial'
import type { Engine } from '@/types'

const fakeEngine = () => ({ nudge: vi.fn(), alignNorth: vi.fn(), alignOrbit: vi.fn(), resetUp: vi.fn(), selectView: vi.fn(), goIss: vi.fn(), setSimSpeed: vi.fn(), setFeature: vi.fn(), setIssView: vi.fn(), setClouds: vi.fn(), setBorders: vi.fn(), setCapitals: vi.fn() }) as unknown as Engine & Record<string, ReturnType<typeof vi.fn>>

describe('TopBar + SubMenu', () => {
  let engine: ReturnType<typeof fakeEngine>
  beforeEach(() => {
    engine = fakeEngine()
    useStore.setState({ ...initialEngineState, panel: null, bodyCategory: 'planets', features: {}, engine })
  })
  it('barre du haut : Astres, Terre, ISS, Nuages ; ni Histoires, ni Fusées, ni Satellites, aucun sous-menu au départ', () => {
    render(<><TopBar /><SubMenu /></>)
    for (const l of ['🌌 Astres', '🌍 Terre', '🛰 ISS', '☁ Nuages']) expect(screen.getByText(l)).toBeInTheDocument()
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
  it('bouton « Vue depuis l’ISS » : dans la fiche de l’ISS (plus dans la barre du haut)', () => {
    useStore.setState({ ...initialEngineState, focus: { id: 'iss' }, issView: false, cardCollapsed: false })
    render(<><TopBar /><BodyCard /></>)
    expect(screen.getAllByText('👁 Vue depuis l’ISS')).toHaveLength(1)
    fireEvent.click(screen.getByText('👁 Vue depuis l’ISS'))
    expect(engine.setIssView).toHaveBeenCalledWith(true)
  })
  it('bouton « Nuages » : active la couverture nuageuse avec son crédit', () => {
    useStore.setState({ clouds: false })
    render(<><TopBar /><MapCredit /></>)
    fireEvent.click(screen.getByText('☁ Nuages'))
    expect(engine.setClouds).toHaveBeenLastCalledWith(true)
    expect(screen.getByText(/matteason/)).toBeInTheDocument()
  })
  it('bloc « Options de carte » : limites de pays et capitales, éteintes par défaut, deux cases à cocher', () => {
    useStore.setState({ borders: false, capitals: false })
    render(<MapOptions />)
    const borders = screen.getByLabelText('Limites de pays') as HTMLInputElement
    const capitals = screen.getByLabelText('Capitales') as HTMLInputElement
    expect(screen.getByText('🗺 Options de carte')).toBeInTheDocument()
    expect(borders.checked).toBe(false)
    expect(capitals.checked).toBe(false)
    fireEvent.click(borders)
    expect(engine.setBorders).toHaveBeenLastCalledWith(true)
    fireEvent.click(capitals)
    expect(engine.setCapitals).toHaveBeenLastCalledWith(true)
    expect(borders.checked).toBe(true)
    fireEvent.click(borders)
    expect(engine.setBorders).toHaveBeenLastCalledWith(false)
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
