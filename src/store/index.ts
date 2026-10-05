// Store Zustand : miroir de l'état publié par le moteur 3D + état propre à l'interface (panneau ouvert, réglages).
// Le moteur n'importe jamais ce fichier : il reçoit `applyPatch` comme canal de publication, et l'interface le pilote par les commandes de `commands.ts`.
import { create } from 'zustand'
import { NUDGE_STEPS } from '@/constants'
import { readCardCollapsed, writeCardCollapsed } from '@/helpers'
import type { BodyCategory, Engine, EnginePatch, EngineState, PanelName } from '@/types'
import { initialEngineState } from './initial'

export type UiState = {
  panel: PanelName | null
  bodyCategory: BodyCategory
  nudgeStep: number   // index dans NUDGE_STEPS
  cardCollapsed: boolean   // fiche d'astre réduite en mini bouton-icône (mémorisé)
  terrainDetail: boolean   // le relief satellite (sous 800 km) est affiché : crédits à montrer (publié par le moteur)
  borders: boolean   // option de carte : limites de pays
  capitals: boolean   // option de carte : noms des capitales
  observatories: boolean   // option de carte : observatoires du monde (cliquables)
  constellations: boolean   // option de carte : constellations (traits entre les étoiles et noms)
  realistic: boolean   // vue réaliste : sans trajectoires, noms, repères ni rien de ce qui n'existe pas
  dayNight: boolean   // option de carte : jour / nuit (éclairage par le vrai Soleil)
  clouds: boolean   // couverture nuageuse affichée
  issView: boolean   // vue depuis l'ISS (publié par le moteur)
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
    toggleClouds: () => void
    toggleBorders: () => void
    toggleCapitals: () => void
    toggleObservatories: () => void
    toggleConstellations: () => void
    toggleDayNight: () => void
    toggleRealistic: () => void
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
  issView: false,
  clouds: false,
  borders: false,
  capitals: false,
  observatories: false,
  constellations: false,
  dayNight: true,
  realistic: false,
  terrainDetail: false,
  setEngine: (engine) => set({ engine }),
  applyPatch: (patch) => set((s) => mergePatch(s, patch)),
  togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
  setBodyCategory: (bodyCategory) => set({ bodyCategory }),
  setCardCollapsed: (cardCollapsed) => {
    writeCardCollapsed(cardCollapsed)
    set({ cardCollapsed })
  },
  toggleBorders: () =>
    set((s) => {
      s.engine?.setBorders(!s.borders)
      return { borders: !s.borders }
    }),
  toggleConstellations: () =>
    set((s) => {
      s.engine?.setConstellations(!s.constellations)
      return { constellations: !s.constellations }
    }),
  toggleRealistic: () =>
    set((s) => {
      s.engine?.setRealistic(!s.realistic)
      return { realistic: !s.realistic }
    }),
  toggleDayNight: () =>
    set((s) => {
      s.engine?.setDayNight(!s.dayNight)
      return { dayNight: !s.dayNight }
    }),
  toggleCapitals: () =>
    set((s) => {
      s.engine?.setCapitals(!s.capitals)
      return { capitals: !s.capitals }
    }),
  toggleObservatories: () =>
    set((s) => {
      s.engine?.setObservatories(!s.observatories)
      return { observatories: !s.observatories }
    }),
  toggleClouds: () =>
    set((s) => {
      s.engine?.setClouds(!s.clouds)
      return { clouds: !s.clouds }
    }),
  cycleNudgeStep: () => set((s) => ({ nudgeStep: (s.nudgeStep + 1) % NUDGE_STEPS.length })),
}))
