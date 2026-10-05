import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BodyCard from '@/components/BodyCard'
import RocketControls from '@/components/RocketControls'
import SubMenu from '@/components/SubMenu'
import TopBar from '@/components/TopBar'
import ViewParams from '@/components/ViewParams'
import { useStore } from '@/store'
import { initialEngineState } from '@/store/initial'
import type { Engine } from '@/types'

const fakeEngine = () => ({ nudge: vi.fn(), selectView: vi.fn(), goIss: vi.fn(), startRocket: vi.fn(() => Promise.resolve()), stopRocket: vi.fn(), setSimSpeed: vi.fn(), setFeature: vi.fn(), setRocketSpeed: vi.fn() }) as unknown as Engine & Record<string, ReturnType<typeof vi.fn>>

describe('TopBar + SubMenu', () => {
  let engine: ReturnType<typeof fakeEngine>
  beforeEach(() => {
    engine = fakeEngine()
    useStore.setState({ ...initialEngineState, panel: null, bodyCategory: 'planets', features: {}, engine })
  })
  it('trois boutons en haut, aucun sous-menu au départ', () => {
    render(<><TopBar /><SubMenu /></>)
    expect(screen.getByText('🌌 Astres')).toBeInTheDocument()
    expect(screen.getByText('🛰 Satellites')).toBeInTheDocument()
    expect(screen.getByText('🚀 Fusées')).toBeInTheDocument()
    expect(screen.queryByText(/Lune/)).toBeNull()
  })
  it('Astres : la Lune n’est pas une planète : elle apparaît sous la Terre, pas sous Mars', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
    expect(screen.getByText(/Terre/)).toBeInTheDocument()
    expect(screen.getByText(/Mars/)).toBeInTheDocument()
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'mars' } }))
    expect(screen.queryByText(/Lune/)).toBeNull()
    act(() => useStore.setState({ view: { mode: 'solar', selected: 'moon' } }))
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
  })
  it('Astres : trois catégories ; la Lune sous la Terre ; Halley dans Comètes ; le Soleil dans Étoiles', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
    expect(screen.getByText('🪐 Planètes')).toBeInTheDocument()
    expect(screen.getByText('☄ Comètes / météorites')).toBeInTheDocument()
    expect(screen.getByText('☀ Étoiles')).toBeInTheDocument()
    expect(screen.getByText(/Lune/)).toBeInTheDocument()
    expect(screen.getByText(/Mars/)).toBeInTheDocument()
    expect(screen.queryByText(/Halley/)).toBeNull()
    expect(screen.queryByText(/Soleil/)).toBeNull()
    fireEvent.click(screen.getByText('☄ Comètes / météorites'))
    fireEvent.click(screen.getByText(/Halley/))
    expect(engine.selectView).toHaveBeenCalledWith('halley')
    expect(screen.queryByText(/Lune/)).toBeNull()
    fireEvent.click(screen.getByText('☀ Étoiles'))
    fireEvent.click(screen.getByText(/Soleil/))
    expect(engine.selectView).toHaveBeenCalledWith('sun')
  })
  it('Astres : un clic sur la Lune change de vue', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🌌 Astres'))
    fireEvent.click(screen.getByText(/Lune/))
    expect(engine.selectView).toHaveBeenCalledWith('moon')
  })
  it('Satellites : les options Dimensions et Trajectoire sont surlignées quand le moteur les a allumées', () => {
    useStore.setState({ features: { size: true, orbit: false } })
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🛰 Satellites'))
    expect(screen.getByText(/Dimensions/).className).toMatch(/_on_/)
    expect(screen.getByText(/Trajectoire/).className).not.toMatch(/_on_/)
  })
  it('Satellites : l’ISS mène à la vue ISS', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🛰 Satellites'))
    fireEvent.click(screen.getByText(/ISS/))
    expect(engine.goIss).toHaveBeenCalled()
  })
  it('Fusées : un clic sur une fusée la lance', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🚀 Fusées'))
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
