// Constantes partagées de l'interface : clés de stockage, vitesses, chemins.
export const STORAGE_KEYS = { cardCollapsed: 'cardCollapsed', achievements: 'achievements' } as const
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const TIME_SPEEDS: ReadonlyArray<{ speed: number; label: string }> = [
  { speed: 1, label: 'Temps réel' },
  { speed: 3600, label: '1 h/s' },
  { speed: 21600, label: '6 h/s' },
  { speed: 86400, label: '1 j/s' },
  { speed: 432000, label: '5 j/s' },
  { speed: 2592000, label: '30 j/s' },
  { speed: 31557600, label: '1 an/s' },
  { speed: 315576000, label: '10 ans/s' },
]
export const ROCKET_SPEEDS: ReadonlyArray<{ speed: number; label: string }> = [
  { speed: 0, label: '⏸' },
  { speed: 1, label: '×1' },
  { speed: 5, label: '×5' },
  { speed: 20, label: '×20' },
  { speed: 60, label: '×60' },
  { speed: 200, label: '×200' },
]
export const PANEL_BUTTONS: ReadonlyArray<{ panel: 'planets' | 'satellites' | 'rockets' | 'stories'; label: string }> = [
  { panel: 'planets', label: '🌌 Astres' },
  { panel: 'stories', label: '📖 Histoires' },
  // « Satellites » et « Fusées » : retirés des boutons (demande de l'utilisateur : « on va faire autrement ») ; leurs composants (SatelliteMenu, RocketMenu, RocketControls), le moteur et les commandes sont CONSERVÉS : pour les remettre, ajouter
  // { panel: 'satellites', label: '🛰 Satellites' } et { panel: 'rockets', label: '🚀 Fusées' } ici.
]

// catégories d'astres du sous-menu « Astres » : types (bodyType du JSON) regroupés par bouton
export const BODY_CATEGORIES: ReadonlyArray<{ id: 'planets' | 'comets' | 'stars'; label: string; types: ReadonlyArray<string> }> = [
  { id: 'planets', label: '🪐 Planètes', types: ['planet', 'dwarf'] },
  { id: 'comets', label: '☄ Comètes / météorites', types: ['comet', 'asteroid'] },
  { id: 'stars', label: '☀ Étoiles', types: ['star'] },
]

export const NUDGE_STEPS: ReadonlyArray<number> = [0.5, 1, 5, 15]   // pas de réglage fin de la vue (°)
export const NUDGE_FIRST_DELAY_MS = 350   // délai avant la répétition en maintenant le bouton
export const NUDGE_REPEAT_MS = 70
