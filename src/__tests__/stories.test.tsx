import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AchievementScreen from '@/components/AchievementScreen'
import CabinView from '@/components/CabinView'
import { buildCabin } from '@/components/CabinView/helpers'
import StoryList from '@/components/StoryList'
import StoryPlayer from '@/components/StoryPlayer'
import { useStore } from '@/store'
import { initialEngineState } from '@/store/initial'
import type { Engine, StoryStep } from '@/types'

const step: StoryStep = {
  id: 's1',
  title: 'Le savais-tu ?',
  text: 'Des mouches ont voyagé dans l’espace.',
} as StoryStep

describe('mode histoire (interface)', () => {
  let engine: { startStory: ReturnType<typeof vi.fn>; setStorySpeed: ReturnType<typeof vi.fn>; setFirstPerson: ReturnType<typeof vi.fn>; storyNext: ReturnType<typeof vi.fn>; quitStory: ReturnType<typeof vi.fn> }
  beforeEach(() => {
    localStorage.clear()
    engine = { startStory: vi.fn(() => Promise.resolve()), setStorySpeed: vi.fn(), setFirstPerson: vi.fn(), storyNext: vi.fn(), quitStory: vi.fn() }
    useStore.setState({ ...initialEngineState, achievements: [], unlocked: null, engine: engine as unknown as Engine })
  })
  it('liste : la liste montre l’histoire de Laïka, un clic la lance', () => {
    render(<StoryList />)
    fireEvent.click(screen.getByText(/Laïka/))
    expect(engine.startStory).toHaveBeenCalledWith('laika')
  })
  it('lecteur : texte et « Suivant »', () => {
    useStore.setState({ story: { active: true, id: 'laika', title: 'Laïka', index: 0, total: 3, phase: 'showing', finished: false, canNext: true, step } })
    render(<StoryPlayer />)
    expect(screen.getByText('Le savais-tu ?')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Suivant/))
    expect(engine.storyNext).toHaveBeenCalled()
  })
  it('curseur : change la vitesse du temps de l’histoire', () => {
    useStore.setState({ story: { active: true, id: 'laika', title: 'Laïka', index: 0, total: 3, phase: 'showing', finished: false, canNext: true, step } })
    render(<StoryPlayer />)
    fireEvent.change(screen.getByLabelText('Vitesse du temps'), { target: { value: '100' } })
    expect(engine.setStorySpeed).toHaveBeenLastCalledWith(200)
  })
  it('bouton « Vue de Laïka » : active la vue à la première personne', () => {
    useStore.setState({ firstPerson: false, story: { active: true, id: 'laika', title: 'Laïka', index: 0, total: 3, phase: 'showing', finished: false, canNext: true, step } })
    render(<StoryPlayer />)
    fireEvent.click(screen.getByText('👁 Vue de Laïka'))
    expect(engine.setFirstPerson).toHaveBeenCalledWith(true)
  })
  it('cabine 3D : un chien dans une cabine, légende affichée même sans WebGL', () => {
    const cabin = buildCabin()
    expect(cabin.children.length).toBeGreaterThanOrEqual(4)
    expect(cabin.children.some((c) => c.children.length > 5)).toBe(true)   // le chien (groupe de formes)
    render(<CabinView />)
    expect(screen.getByText(/cabine de Laïka/)).toBeInTheDocument()
  })
  it('fin d’histoire : le haut fait est débloqué, mémorisé et affiché', () => {
    useStore.setState({ story: { active: true, id: 'laika', title: 'Laïka', index: 2, total: 3, phase: 'showing', finished: true, canNext: true, step } })
    render(<><StoryPlayer /><AchievementScreen /></>)
    act(() => {})
    expect(useStore.getState().achievements).toContain('laika-1957')
    expect(JSON.parse(localStorage.getItem('achievements') ?? '[]')).toContain('laika-1957')
    expect(screen.getByText('Super !')).toBeInTheDocument()
    expect(engine.quitStory).toHaveBeenCalled()
  })
})
