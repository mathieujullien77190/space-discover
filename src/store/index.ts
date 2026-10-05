// Store Zustand : miroir de l'état publié par le moteur 3D + état propre à l'interface (panneau ouvert, réglages).
// Le moteur n'importe jamais ce fichier : il reçoit `applyPatch` comme canal de publication, et l'interface le pilote par les commandes de `commands.ts`.
import { create } from 'zustand'
import { NUDGE_STEPS } from '@/constants'
import type { BodyCategory, Engine, EnginePatch, EngineState, PanelName } from '@/types'
import { initialEngineState } from './initial'

export type UiState = {
  panel: PanelName | null
  bodyCategory: BodyCategory
  nudgeStep: number   // index dans NUDGE_STEPS
  features: Record<string, boolean>
}

export type Store = EngineState &
  UiState & {
    engine: Engine | null
    setEngine: (engine: Engine | null) => void
    applyPatch: (patch: EnginePatch) => void
    togglePanel: (panel: PanelName) => void
    setBodyCategory: (category: BodyCategory) => void
    cycleNudgeStep: () => void
    setFeatureFlag: (id: string, on: boolean) => void
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
  features: {},
  setEngine: (engine) => set({ engine }),
  applyPatch: (patch) => set((s) => mergePatch(s, patch)),
  togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
  setBodyCategory: (bodyCategory) => set({ bodyCategory }),
  cycleNudgeStep: () => set((s) => ({ nudgeStep: (s.nudgeStep + 1) % NUDGE_STEPS.length })),
  setFeatureFlag: (id, on) => set((s) => ({ features: { ...s.features, [id]: on } })),
}))
