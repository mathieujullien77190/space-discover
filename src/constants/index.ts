// Constantes partagées de l'interface : clés de stockage, vitesses, chemins.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
export const STORAGE_KEYS = { metric: 'metric' } as const

export const TIME_SPEEDS: ReadonlyArray<{ speed: number; label: string }> = [
  { speed: 1, label: 'Temps réel' },
  { speed: 3600, label: '1 h/s' },
  { speed: 21600, label: '6 h/s' },
  { speed: 86400, label: '1 j/s' },
  { speed: 432000, label: '5 j/s' },
]
export const ROCKET_SPEEDS: ReadonlyArray<{ speed: number; label: string }> = [
  { speed: 0, label: '⏸' },
  { speed: 1, label: '×1' },
  { speed: 5, label: '×5' },
  { speed: 20, label: '×20' },
  { speed: 60, label: '×60' },
  { speed: 200, label: '×200' },
]
export const PANEL_BUTTONS: ReadonlyArray<{ panel: 'planets' | 'satellites' | 'rockets'; label: string }> = [
  { panel: 'planets', label: '🪐 Planètes' },
  { panel: 'satellites', label: '🛰 Satellites' },
  { panel: 'rockets', label: '🚀 Fusées' },
]
