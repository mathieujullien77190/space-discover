// Commandes de l'interface vers le moteur 3D (via l'instance rangée dans le store) + effets de bord liés (mémorisation, panneau ouvert).
// Sans moteur démarré : sans effet.
import { writeMetric } from '@/helpers'
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
export const setMetric = (on: boolean): void => {
  useStore.getState().setMetricFlag(on)
  writeMetric(on)
  engine()?.setMetric(on)
}
export const startRocket = (key: string): void => {
  void engine()?.startRocket(key)
}
export const stopRocket = (): void => engine()?.stopRocket()
export const setRocketSpeed = (speed: number): void => engine()?.setRocketSpeed(speed)
