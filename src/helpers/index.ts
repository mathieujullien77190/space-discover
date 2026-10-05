// Helpers partagés (mise en forme, stockage).
import { STORAGE_KEYS } from '@/constants'

export const formatUtcDate = (ms: number, accelerated: boolean): string =>
  new Date(ms).toLocaleString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) +
  ' UTC' +
  (accelerated ? ' · accéléré' : '')


export const readCardCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.cardCollapsed) === '1'
  } catch {
    return false
  }
}

export const writeCardCollapsed = (on: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.cardCollapsed, on ? '1' : '0')
  } catch {
    /* stockage indisponible : réglage non mémorisé */
  }
}
