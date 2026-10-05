// Helpers partagés (mise en forme, stockage).
import { MAP_STYLE_ORDER, STORAGE_KEYS } from '@/constants'
import type { MapStyle } from '@/types'

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

// valeur d'un <input type="datetime-local"> (heure UTC, sans secondes) ↔ millisecondes
export const toInputValue = (ms: number): string => new Date(ms).toISOString().slice(0, 16)
export const fromInputValue = (value: string): number | null => {
  const ms = Date.parse(value + ':00Z')
  return Number.isFinite(ms) ? ms : null
}

// hauts faits débloqués (tableau d'identifiants) et option « lire à voix haute » : localStorage, toujours en try/catch (navigation privée, stockage bloqué…)
export const readAchievements = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const writeAchievements = (ids: string[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(ids))
  } catch {
    /* stockage indisponible : le haut fait n'est pas mémorisé */
  }
}

// Fond de carte suivant : dessiné → plan → relief → dessiné…
export const nextMapStyle = (style: MapStyle): MapStyle => MAP_STYLE_ORDER[(MAP_STYLE_ORDER.indexOf(style) + 1) % MAP_STYLE_ORDER.length]
