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
  mission: string | null   // mission historique en cours de lancement (id de la sonde)
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

export type StoryStep = {
  id: string
  at: string
  title: string
  text: string
  pause?: boolean
  camera?: { follow?: string; firstPerson?: boolean; slowMotion?: boolean; issView?: boolean; mapDetail?: boolean }
  scene?: 'cabin'   // illustration 3D affichée dans l'étape
  image?: { src: string; alt: string; credit: string; license: string }
  source?: string
}
export type StoryState = { active: boolean; id: string | null; title: string; index: number; total: number; phase: 'showing' | 'running'; finished: boolean; canNext: boolean; canPrev: boolean; step: StoryStep | null }
export type StoryInfo = { id: string; title: string; year: number; icon: string; achievement: { id: string; title: string; text: string; icon: string } | null }

export type EngineState = {
  status: EngineStatus
  error: string | null
  view: ViewState
  info: string
  viewJson: string
  time: TimeState
  scale: ScaleState
  rocket: RocketState
  story: StoryState
  features: Record<string, boolean>   // options de l'ISS allumées (size, orbit)
  focus: { id: string | null }   // astre dont on est proche (sa fiche s'affiche), sinon null
}

// Correctif envoyé par le moteur : chaque tranche peut être partielle (fusion superficielle dans le store).
export type MapStyle = 'drawn' | 'street' | 'clean' | 'ocean' | 'terrain' | 'contours'   // fond de carte : dessiné (Natural Earth), plan type Google Maps (CARTO / OpenStreetMap) ou relief (forêts, montagnes : OpenTopoMap)
export type EnginePatch = {
  [K in keyof EngineState]?: EngineState[K] extends object ? Partial<EngineState[K]> : EngineState[K]
} & { bigVehicles?: boolean; firstPerson?: boolean }   // le moteur peut aussi activer le mode engins géants (histoire : à 50 km d'altitude)

export type BodyFact = { label: string; value: string }
export type BodyCardData = { id: string; name: string; kind: string; canNorth: boolean; canOrbit: boolean; image: string; facts: BodyFact[] }   // canNorth / canOrbit : boutons « Nord en haut » / « Orbite à plat » de la fiche
export type MenuItem = { id: string; label: string; type: string; around: string | null }   // type : bodyType du JSON (planet, moon, comet, star…) ; around : corps central (une lune dépend de sa planète)
export type FeatureItem = { id: string; label: string }
export type SatelliteItem = { key: string; name: string; kind: 'iss' | 'probe'; from: number }   // from : date (ms) à partir de laquelle l'objet existe
export type RocketOption = { key: string; label: string }
export type MissionLaunch = { key: string; label: string; date: number }   // lancement d'une mission historique (sonde + date)

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
  setBigVehicles: (on: boolean) => void
  setFirstPerson: (on: boolean) => void
  setIssView: (on: boolean) => void
  setMapStyle: (style: MapStyle) => void
  setClouds: (on: boolean) => void
  _clouds: () => { on: boolean; state: string | null; level: string | null; visible: boolean; opacity: number }
  _map: () => { style: MapStyle; shown: boolean; tiles: number; ready: number; loading: number }
  setViewInset: (right: number, bottom: number) => void
  setStorySlowMotion: (on: boolean) => void
  _fp: () => { yaw: number; pitch: number; fov: number; posErr: number | null; dir: number[]; up: number[]; radial: number[] | null; flight: number[] | null } | null
  setStorySpeed: (speed: number) => void
  startRocket: (key: string, custom?: unknown) => Promise<unknown>
  stopRocket: () => void
  startStory: (id: string) => Promise<unknown>
  storyNext: () => void
  storyPrev: () => void
  quitStory: () => void
  launchMission: (id: string) => Promise<unknown>
  followMission: () => void
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
  _probe: (id: string) => { shown: boolean; dist: number; camDist: number; dot: boolean; model: boolean; path: boolean; local: boolean; pos: number[]; abs: number[]; r: number[] | null; label: string } | null
  _probeDistance: (probe: string, body: string) => number
  _vehicle: () => { vk: number; scale: number; camKm: number; lenKm: number } | null
  _inset: () => { cr: number; offsetX: number; enabled: boolean }
  _story: () => { index: number; next: number; phase: string; finished: boolean; trig: number[]; T: number | null; playing: boolean | null; speed: number | null } | null
  _lod: () => { earth: number; bodies: Record<string, number>; ratio: number }
}

export type CreateEngineOptions = {
  canvas: HTMLCanvasElement
  overlay: HTMLElement
  publish: (patch: EnginePatch) => void
  baseUrl?: string
  showProbes?: boolean   // dessiner les sondes rejouées (désactivé par défaut)
  createRenderer?: (canvas: HTMLCanvasElement) => unknown
}

export type PanelName = 'planets' | 'satellites' | 'rockets' | 'stories'
export type BodyCategory = 'planets' | 'comets' | 'stars'
