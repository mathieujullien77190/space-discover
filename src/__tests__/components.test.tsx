import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RocketControls from '@/components/RocketControls'
import SubMenu from '@/components/SubMenu'
import TopBar from '@/components/TopBar'
import { useStore } from '@/store'
import { initialEngineState } from '@/store/initial'
import type { Engine } from '@/types'

const fakeEngine = () => ({ selectView: vi.fn(), goIss: vi.fn(), startRocket: vi.fn(() => Promise.resolve()), stopRocket: vi.fn(), setSimSpeed: vi.fn(), setFeature: vi.fn(), setMetric: vi.fn(), setRocketSpeed: vi.fn() }) as unknown as Engine & Record<string, ReturnType<typeof vi.fn>>

describe('TopBar + SubMenu', () => {
  let engine: ReturnType<typeof fakeEngine>
  beforeEach(() => {
    engine = fakeEngine()
    useStore.setState({ ...initialEngineState, panel: null, metric: false, features: {}, engine })
  })
  it('trois boutons en haut, aucun sous-menu au départ', () => {
    render(<><TopBar /><SubMenu /></>)
    expect(screen.getByText('🪐 Planètes')).toBeInTheDocument()
    expect(screen.getByText('🛰 Satellites')).toBeInTheDocument()
    expect(screen.getByText('🚀 Fusées')).toBeInTheDocument()
    expect(screen.queryByText(/Lune/)).toBeNull()
  })
  it('Planètes : déroule les astres en dessous, un clic change de vue', () => {
    render(<><TopBar /><SubMenu /></>)
    fireEvent.click(screen.getByText('🪐 Planètes'))
    fireEvent.click(screen.getByText(/Lune/))
    expect(engine.selectView).toHaveBeenCalledWith('moon')
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
    fireEvent.click(screen.getByText('🪐 Planètes'))
    fireEvent.click(screen.getByText('🪐 Planètes'))
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
