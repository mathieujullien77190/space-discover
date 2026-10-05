// Boutons de réglage de la vue : cap (yaw), pitch, distance (« ＋ » rapproche, « － » éloigne).
export const NUDGE_CONTROLS: ReadonlyArray<{ name: string; buttons: ReadonlyArray<{ kind: string; label: string }> }> = [
  { name: 'cap', buttons: [{ kind: 'y-', label: '◀' }, { kind: 'y+', label: '▶' }] },
  { name: 'pitch', buttons: [{ kind: 'p+', label: '▲' }, { kind: 'p-', label: '▼' }] },
  { name: 'dist', buttons: [{ kind: 'd-', label: '＋' }, { kind: 'd+', label: '－' }] },
]
