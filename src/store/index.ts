// Store Zustand : miroir de l'état publié par le moteur 3D + état propre à l'interface (panneau ouvert, réglages).
// Le moteur n'importe jamais ce fichier : il reçoit `applyPatch` comme canal de publication, et l'interface le pilote par les commandes de `commands.ts`.
import { create } from 'zustand'
import { NUDGE_STEPS } from '@/constants'
import { readAchievements, readCardCollapsed, writeAchievements, writeCardCollapsed } from '@/helpers'
import { nextMapStyle } from '@/helpers'
import type { BodyCategory, Engine, EnginePatch, EngineState, MapStyle, PanelName } from '@/types'
import { initialEngineState } from './initial'

export type UiState = {
  panel: PanelName | null
  bodyCategory: BodyCategory
  nudgeStep: number   // index dans NUDGE_STEPS
  cardCollapsed: boolean   // fiche d'astre réduite en mini bouton-icône (mémorisé)
  achievements: string[]   // hauts faits débloqués (mémorisés)
  slowMotion: boolean   // histoire : ralenti aux étapes (publié par le moteur)
  mapStyle: MapStyle   // fond de carte de la Terre
  issView: boolean   // vue depuis l'ISS (publié par le moteur)
  firstPerson: boolean   // vue à la première personne (publié par le moteur)
  bigVehicles: boolean   // mode « engins géants » : fusées, satellites et ISS 1 000 fois plus gros
  unlocked: string | null   // haut fait qu'on vient de débloquer (écran de déblocage)
}

export type Store = EngineState &
  UiState & {
    engine: Engine | null
    setEngine: (engine: Engine | null) => void
    applyPatch: (patch: EnginePatch) => void
    togglePanel: (panel: PanelName) => void
    setBodyCategory: (category: BodyCategory) => void
    cycleNudgeStep: () => void
    setCardCollapsed: (on: boolean) => void
    unlockAchievement: (id: string) => void
    dismissUnlocked: () => void
    toggleBigVehicles: () => void
    toggleMapStyle: () => void
  }

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// fusion superficielle par tranche : { time: { speed } } ne touche pas aux autres champs de `time`
export const mergePatch = (state: EngineState, patch: EnginePatch): Partial<EngineState> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const cur = (state as Record<string, unknown>)[k]
    out[k] = isPlainObject(v) && isPlainObject(cur) ? { ...cur, ...v } : v
  }
  return out as Partial<EngineState>
}

export const useStore = create<Store>((set) => ({
  ...initialEngineState,
  engine: null,
  panel: null,
  bodyCategory: 'planets',
  nudgeStep: 1,
  cardCollapsed: readCardCollapsed(),
  achievements: readAchievements(),
  unlocked: null,
  bigVehicles: false,
  firstPerson: false,
  issView: false,
  mapStyle: 'drawn',
  slowMotion: true,
  setEngine: (engine) => set({ engine }),
  applyPatch: (patch) => set((s) => mergePatch(s, patch)),
  togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
  setBodyCategory: (bodyCategory) => set({ bodyCategory }),
  setCardCollapsed: (cardCollapsed) => {
    writeCardCollapsed(cardCollapsed)
    set({ cardCollapsed })
  },
  unlockAchievement: (id) =>
    set((s) => {
      const achievements = s.achievements.includes(id) ? s.achievements : [...s.achievements, id]
      writeAchievements(achievements)
      return { achievements, unlocked: id }
    }),
  dismissUnlocked: () => set({ unlocked: null }),
  toggleMapStyle: () =>
    set((s) => {
      const mapStyle = nextMapStyle(s.mapStyle)
      s.engine?.setMapStyle(mapStyle)
      return { mapStyle }
    }),
  toggleBigVehicles: () =>
    set((s) => {
      s.engine?.setBigVehicles(!s.bigVehicles)
      return { bigVehicles: !s.bigVehicles }
    }),
  cycleNudgeStep: () => set((s) => ({ nudgeStep: (s.nudgeStep + 1) % NUDGE_STEPS.length })),
}))
