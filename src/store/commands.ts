// Commandes de l'interface vers le moteur 3D (via l'instance rangée dans le store) + effets de bord liés (mémorisation, panneau ouvert).
// Sans moteur démarré : sans effet.
import { NUDGE_STEPS } from '@/constants'
import { useStore } from '.'

const engine = () => useStore.getState().engine

export const selectView = (id: string): void => engine()?.selectView(id)
export const goIss = (): void => engine()?.goIss()
export const goHubble = (): void => engine()?.goHubble()
export const goConcorde = (): void => engine()?.goConcorde()
export const flyConcorde = (flightId: string): void => engine()?.flyConcorde(flightId)
export const clearStar = (): void => engine()?.clearStar()
export const setSimSpeed = (speed: number): void => engine()?.setSimSpeed(speed)
export const resetTime = (): void => engine()?.resetTime()
export const setDate = (ms: number): void => engine()?.setDate(ms)
export const setFeature = (id: string, on: boolean): void => engine()?.setFeature(id, on)
export const nudge = (kind: string): void => {
  const s = useStore.getState()
  s.engine?.nudge(kind, NUDGE_STEPS[s.nudgeStep])
}
export const alignNorth = (id: string): void => engine()?.alignNorth(id)
export const alignOrbit = (id: string): void => engine()?.alignOrbit(id)
export const resetUp = (): void => engine()?.resetUp()
export const setIssView = (on: boolean): void => engine()?.setIssView(on)
export const goObservatory = (id: string): void => engine()?.goObservatory(id)
export const setObservatoryView = (on: boolean): void => engine()?.setObservatoryView(on)
