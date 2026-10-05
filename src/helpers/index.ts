// Helpers purs partagés (mise en forme, stockage).
import { STORAGE_KEYS } from '@/constants'

export const formatUtcDate = (ms: number, accelerated: boolean): string =>
  new Date(ms).toLocaleString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) +
  ' UTC' +
  (accelerated ? ' · accéléré' : '')

export const readMetric = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.metric) === '1'
  } catch {
    return false
  }
}

export const writeMetric = (on: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.metric, on ? '1' : '0')
  } catch {
    /* stockage indisponible : réglage non mémorisé */
  }
}
