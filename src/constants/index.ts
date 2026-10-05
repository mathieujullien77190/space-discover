// Constantes partagées de l'interface : clés de stockage, vitesses, chemins.
export const STORAGE_KEYS = { cardCollapsed: 'cardCollapsed' } as const
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const TIME_SPEEDS: ReadonlyArray<{ speed: number; label: string }> = [
  { speed: 1, label: 'Temps réel' },
  { speed: 60, label: '1 min/s' },
  { speed: 600, label: '10 min/s' },
  { speed: 3600, label: '1 h/s' },
  { speed: 21600, label: '6 h/s' },
  { speed: 86400, label: '1 j/s' },
  { speed: 432000, label: '5 j/s' },
  { speed: 2592000, label: '30 j/s' },
  { speed: 31557600, label: '1 an/s' },
  { speed: 315576000, label: '10 ans/s' },
]
export const PANEL_BUTTONS: ReadonlyArray<{ panel: 'planets'; label: string }> = [{ panel: 'planets', label: '🌌 Astres' }]

// catégories d'astres du sous-menu « Astres » : types (bodyType du JSON) regroupés par bouton
export const BODY_CATEGORIES: ReadonlyArray<{ id: 'planets' | 'comets' | 'stars'; label: string; types: ReadonlyArray<string> }> = [
  { id: 'planets', label: '🪐 Planètes', types: ['planet', 'dwarf'] },
  { id: 'comets', label: '☄ Comètes / météorites', types: ['comet', 'asteroid'] },
  { id: 'stars', label: '☀ Étoiles', types: ['star'] },
]

export const NUDGE_STEPS: ReadonlyArray<number> = [0.5, 1, 5, 15]   // pas de réglage fin de la vue (°)
export const NUDGE_FIRST_DELAY_MS = 350   // délai avant la répétition en maintenant le bouton
export const NUDGE_REPEAT_MS = 70
export const ISS_VIEW_LABELS = { on: '👁 Vue depuis l’ISS', off: '↩ Quitter la vue ISS', go: '🛰 ISS', hubble: '🔭 Hubble' } as const   // bouton de la barre du haut
export const EARTH_LABEL = '🌍 Terre'   // retour à la vue Terre, de n'importe quelle vue
export const MAP_OPTIONS_TITLE = '🗺 Options de carte'   // bloc d'options du ciel (en bas à gauche) : infos étoiles, constellations
export const MAP_OPTIONS = [
  { key: 'starInfo', label: 'Infos étoiles (clic)' },
  { key: 'constellations', label: 'Constellations' },
] as const   // cases à cocher, éteintes par défaut
// options de la Terre, dans la fiche de la Terre et celle d'un observatoire (en haut à droite) : seuls les observatoires sont cochés par défaut
export const EARTH_OPTIONS = [
  { key: 'borders', label: 'Limites de pays' },
  { key: 'capitals', label: 'Capitales' },
  { key: 'observatories', label: 'Observatoires' },
] as const
export const REALISTIC_LABEL = '🎬 Vue réaliste'   // retire trajectoires, noms, repères et tout ce qui n'existe pas dans la réalité
