import { beforeEach, describe, expect, it } from 'vitest'
import { initialEngineState } from '@/store/initial'
import { mergePatch, useStore } from '@/store'

describe('mergePatch', () => {
  it('fusionne une tranche partielle sans toucher aux autres champs', () => {
    const out = mergePatch(initialEngineState, { time: { speed: 3600 } })
    expect(out.time).toEqual({ ...initialEngineState.time, speed: 3600 })
  })
  it('remplace les valeurs simples', () => {
    expect(mergePatch(initialEngineState, { info: 'x', status: 'ready' })).toEqual({ info: 'x', status: 'ready' })
  })
  it('remplace les tableaux entiers', () => {
    const out = mergePatch(initialEngineState, { rocket: { steps: [{ t: 0, label: 'Décollage' }] } })
    expect(out.rocket?.steps).toHaveLength(1)
    expect(out.rocket?.running).toBe(false)
  })
})

describe('store', () => {
  beforeEach(() => useStore.setState({ ...initialEngineState, panel: null, features: {}, engine: null }))
  it('ouvre puis referme un panneau en cliquant deux fois', () => {
    useStore.getState().togglePanel('planets')
    expect(useStore.getState().panel).toBe('planets')
    useStore.getState().togglePanel('planets')
    expect(useStore.getState().panel).toBeNull()
  })
  it('un seul panneau à la fois', () => {
    useStore.getState().togglePanel('planets')
    useStore.getState().togglePanel('rockets')
    expect(useStore.getState().panel).toBe('rockets')
  })
  it('applyPatch met à jour l’état publié par le moteur', () => {
    useStore.getState().applyPatch({ view: { mode: 'iss', selected: null }, scale: { widthPx: 80, label: '10 km' } })
    expect(useStore.getState().view.mode).toBe('iss')
    expect(useStore.getState().scale.label).toBe('10 km')
  })
})
