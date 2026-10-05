// Commandes de l'interface vers le moteur 3D (via l'instance rangée dans le store) + effets de bord liés (mémorisation, panneau ouvert).
// Sans moteur démarré : sans effet.
import { NUDGE_STEPS } from '@/constants'
import { useStore } from '.'

const engine = () => useStore.getState().engine

export const selectView = (id: string): void => engine()?.selectView(id)
export const goIss = (): void => engine()?.goIss()
export const setSimSpeed = (speed: number): void => engine()?.setSimSpeed(speed)
export const resetTime = (): void => engine()?.resetTime()
export const setDate = (ms: number): void => engine()?.setDate(ms)
export const setFeature = (id: string, on: boolean): void => engine()?.setFeature(id, on)
export const startRocket = (key: string): void => {
  void engine()?.startRocket(key)
}
export const stopRocket = (): void => engine()?.stopRocket()
export const setRocketSpeed = (speed: number): void => engine()?.setRocketSpeed(speed)
export const nudge = (kind: string): void => {
  const s = useStore.getState()
  s.engine?.nudge(kind, NUDGE_STEPS[s.nudgeStep])
}
export const alignNorth = (id: string): void => engine()?.alignNorth(id)
export const alignOrbit = (id: string): void => engine()?.alignOrbit(id)
export const resetUp = (): void => engine()?.resetUp()
export const launchMission = (id: string): void => {
  void engine()?.launchMission(id)
}
export const followMission = (): void => engine()?.followMission()
export const startStory = (id: string): void => {
  void engine()?.startStory(id)
}
export const storyNext = (): void => engine()?.storyNext()
export const quitStory = (): void => engine()?.quitStory()
export const setStorySpeed = (speed: number): void => engine()?.setStorySpeed(speed)
export const setFirstPerson = (on: boolean): void => engine()?.setFirstPerson(on)
