// Commandes de l'interface vers le moteur 3D (via l'instance rangée dans le store) + effets de bord liés (mémorisation, panneau ouvert).
// Sans moteur démarré : sans effet.
import { NUDGE_STEPS } from '@/constants'
import { useStore } from '.'

const engine = () => useStore.getState().engine

export const selectView = (id: string): void => engine()?.selectView(id)
export const goIss = (): void => engine()?.goIss()
export const setSimSpeed = (speed: number): void => engine()?.setSimSpeed(speed)
export const resetTime = (): void => engine()?.resetTime()
export const setFeature = (id: string, on: boolean): void => {
  useStore.getState().setFeatureFlag(id, on)
  engine()?.setFeature(id, on)
}
export const startRocket = (key: string): void => {
  void engine()?.startRocket(key)
}
export const stopRocket = (): void => engine()?.stopRocket()
export const setRocketSpeed = (speed: number): void => engine()?.setRocketSpeed(speed)
export const nudge = (kind: string): void => {
  const s = useStore.getState()
  s.engine?.nudge(kind, NUDGE_STEPS[s.nudgeStep])
}
