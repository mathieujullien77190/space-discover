// Types partagés : état publié par le moteur 3D (voir src/engine/app.js) et formes de données de l'interface.
export type ViewMode = 'earth' | 'iss' | 'solar' | 'launch'
export type ViewState = { mode: ViewMode; selected: string | null; align: 'north' | 'orbit' | null }   // selected : id de l'astre choisi (null en vue ISS) ; align : « haut » de l'écran = pôle nord de l'astre, normale de son orbite, ou celui du monde (null)
export type EngineStatus = 'loading' | 'ready' | 'error'

export type TimeState = { simMs: number; speed: number; visible: boolean }
export type ScaleState = { widthPx: number; label: string }

export type RocketStep = { t: number; label: string }
export type RocketComponent = { id: string; name: string; follow: boolean; infoOn: boolean; hasInfo: boolean; value: string }
export type RocketTelemetry = { eff: number; alt: number; v: number }
export type RocketState = {
  running: boolean
  loading: boolean
  message: string
  steps: RocketStep[]
  components: RocketComponent[]
  T: number
  playing: boolean
  speed: number
  telemetry: RocketTelemetry
}

export type EngineState = {
  status: EngineStatus
  error: string | null
  view: ViewState
  info: string
  viewJson: string
  time: TimeState
  scale: ScaleState
  rocket: RocketState
  features: Record<string, boolean>   // options de l'ISS allumées (size, orbit)
  focus: { id: string | null }   // astre dont on est proche (sa fiche s'affiche), sinon null
}

// Correctif envoyé par le moteur : chaque tranche peut être partielle (fusion superficielle dans le store).
export type EnginePatch = {
  [K in keyof EngineState]?: EngineState[K] extends object ? Partial<EngineState[K]> : EngineState[K]
}

export type BodyFact = { label: string; value: string }
export type BodyCardData = { id: string; name: string; kind: string; canNorth: boolean; canOrbit: boolean; image: string; facts: BodyFact[] }   // canNorth / canOrbit : boutons « Nord en haut » / « Orbite à plat » de la fiche
export type MenuItem = { id: string; label: string; type: string; around: string | null }   // type : bodyType du JSON (planet, moon, comet, star…) ; around : corps central (une lune dépend de sa planète)
export type FeatureItem = { id: string; label: string }
export type SatelliteItem = { key: string; name: string; kind: 'iss' | 'probe'; from: number }   // from : date (ms) à partir de laquelle l'objet existe
export type RocketOption = { key: string; label: string }

// Commandes du moteur (voir createEngine dans src/engine/app.js).
export type Engine = {
  selectView: (id: string) => void
  goIss: () => void
  alignNorth: (id: string) => void
  alignOrbit: (id: string) => void
  resetUp: () => void
  nudge: (kind: string, stepDeg: number) => void
  setSimSpeed: (speed: number) => void
  resetTime: () => void
  setDate: (ms: number) => void
  setFeature: (id: string, on: boolean) => void
  setMetric: (on: boolean) => void
  startRocket: (key: string, custom?: unknown) => Promise<unknown>
  stopRocket: () => void
  setRocketSpeed: (speed: number) => void
  followComponent: (id: string) => void
  toggleComponentInfo: (id: string) => void
  dispose: () => void
  _frame: (now: number) => void
  _featuresVisible: () => Record<string, boolean>
  _orbitsVisible: () => Record<string, boolean>
  _localOrbit: (id: string) => { visible: boolean; coarse: boolean; n: number; mid: number[]; pos: number[]; end: number[] } | null
  _dotVisible: () => Record<string, boolean>
  _axisVisible: () => Record<string, boolean>
  _view: () => { up: number[]; dir: number[]; custom: boolean; align: 'north' | 'orbit' | null }
  _probe: (id: string) => { shown: boolean; dot: boolean; model: boolean; path: boolean; local: boolean; pos: number[]; abs: number[]; r: number[] | null; label: string } | null
  _probeDistance: (probe: string, body: string) => number
  _lod: () => { earth: number; bodies: Record<string, number>; ratio: number }
}

export type CreateEngineOptions = {
  canvas: HTMLCanvasElement
  overlay: HTMLElement
  publish: (patch: EnginePatch) => void
  baseUrl?: string
  createRenderer?: (canvas: HTMLCanvasElement) => unknown
}

export type PanelName = 'planets' | 'satellites' | 'rockets'
export type BodyCategory = 'planets' | 'comets' | 'stars'
