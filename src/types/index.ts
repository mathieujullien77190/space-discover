// Types partagés : état publié par le moteur 3D (voir src/engine/app.js) et formes de données de l'interface.
export type ViewMode = 'earth' | 'iss' | 'solar'
export type ViewState = { mode: ViewMode; selected: string | null; align: 'north' | 'orbit' | null }   // selected : id de l'astre choisi (null en vue ISS) ; align : « haut » de l'écran = pôle nord de l'astre, normale de son orbite, ou celui du monde (null)
export type EngineStatus = 'loading' | 'ready' | 'error'

export type TimeState = { simMs: number; speed: number; visible: boolean }
export type ScaleState = { widthPx: number; label: string }

export type EngineState = {
  status: EngineStatus
  error: string | null
  view: ViewState
  observatory: { id: string | null; view: boolean }   // observatoire choisi et vue « depuis » active
  star: { hip: number | null }   // étoile sélectionnée (option « Infos étoiles ») : numéro Hipparcos
  info: string
  viewJson: string
  time: TimeState
  scale: ScaleState
  features: Record<string, boolean>   // options de l'ISS allumées (size, orbit)
  focus: { id: string | null }   // astre dont on est proche (sa fiche s'affiche), sinon null
}

// Correctif envoyé par le moteur : chaque tranche peut être partielle (fusion superficielle dans le store).
export type EnginePatch = {
  [K in keyof EngineState]?: EngineState[K] extends object ? Partial<EngineState[K]> : EngineState[K]
} & { bigVehicles?: boolean; firstPerson?: boolean; clouds?: boolean; terrainDetail?: boolean }   // clés publiées par le moteur hors des tranches de EngineState

export type BodyFact = { label: string; value: string }
export type BodyCardData = { id: string; name: string; kind: string; canNorth: boolean; canOrbit: boolean; image: string; facts: BodyFact[] }   // canNorth / canOrbit : boutons « Nord en haut » / « Orbite à plat » de la fiche
export type MenuItem = { id: string; label: string; type: string; around: string | null }   // type : bodyType du JSON (planet, moon, comet, star…) ; around : corps central (une lune dépend de sa planète)
export type FeatureItem = { id: string; label: string }

// Commandes du moteur (voir createEngine dans src/engine/app.js).
export type Engine = {
  selectView: (id: string) => void
  goIss: () => void
  goHubble: () => void
  goMoonSite: (id: string) => void
  goConcorde: () => void
  flyConcorde: (flightId: string) => void
  alignNorth: (id: string) => void
  alignOrbit: (id: string) => void
  resetUp: () => void
  nudge: (kind: string, stepDeg: number) => void
  setSimSpeed: (speed: number) => void
  resetTime: () => void
  setDate: (ms: number) => void
  setFeature: (id: string, on: boolean) => void
  setMetric: (on: boolean) => void
  setIssView: (on: boolean) => void
  setClouds: (on: boolean) => void
  setBorders: (on: boolean) => void
  setCapitals: (on: boolean) => void
  setObservatories: (on: boolean) => void
  setStarInfo: (on: boolean) => void
  clearStar: () => void
  _hubbleFeatures: () => Record<string, boolean>
  _concordeFeatures: () => Record<string, boolean>
  _skyObs: () => { on: boolean; orange: number; day: number; stars: boolean; moonBoost: number }
  _concorde: () => { active: boolean; flight: string | null; alt: number; mach: number; speedKmh: number; t: number; model: boolean; dot: boolean }
  _moonSite: () => { id: string | null; view: boolean; group: boolean; eyeErrM: number | null; near: number; labels: number; realistic: boolean }
  _airliner: () => { active: boolean; count: number; t: number; elevation: number; model: boolean; lights: boolean; strobe: boolean; glow: boolean; strobeGlow: boolean; night: boolean; px: number }
  _airlinerSkip: (sec: number) => void
  _airlinerSpawnMore: () => boolean
  _meteors: () => { active: number; total: number }
  _spawnMeteor: () => boolean
  _moonBoost: () => number
  _moonBright: () => number
  _starInfo: () => { on: boolean; hip: number | null; ring: string }
  _starsOnScreen: (n?: number) => { hip: number; x: number; y: number }[]
  _pickStarAt: (x: number, y: number) => number | null
  goObservatory: (id: string) => void
  setObservatoryView: (on: boolean) => void
  _obs: () => { id: string | null; view: boolean; label: string; dot: boolean; camAltKm: number; posErr: number | null; day: number; stars: boolean; starOpacity: number[]; atmSun: number; orange: number }
  setRealistic: (on: boolean) => void
  setConstellations: (on: boolean) => void
  setDayNight: (on: boolean) => void
  _glare: () => { visible: boolean; opacity: number; scale: number }
  _sun: () => { lon: number; lat: number }
  _constellation: () => { selected: string | null; lines: number; highlighted: boolean }
  _mapOptions: () => { borders: boolean; capitals: number; observatories: number; constellations: boolean; constellationNames: number; realistic: boolean; dayNight: boolean; ambient: number; sunPoint: boolean }
  _terrain: () => { gain: number; glow: number; levels: number; shown: boolean; tiles: number; ready: number; loading: number; seaOffset: number }
  _clouds: () => { on: boolean; state: string | null; level: string | null; visible: boolean; opacity: number }
  _fp: () => { yaw: number; pitch: number; fov: number; posErr: number | null; dir: number[]; up: number[]; radial: number[] | null; flight: number[] | null } | null
  dispose: () => void
  _frame: (now: number) => void
  _featuresVisible: () => Record<string, boolean>
  _orbitsVisible: () => Record<string, boolean>
  _localOrbit: (id: string) => { visible: boolean; coarse: boolean; n: number; mid: number[]; pos: number[]; end: number[] } | null
  _dotVisible: () => Record<string, boolean>
  _axisVisible: () => Record<string, boolean>
  _view: () => { up: number[]; dir: number[]; custom: boolean; align: 'north' | 'orbit' | null }
  _lod: () => { earth: number; bodies: Record<string, number>; ratio: number }
}

export type CreateEngineOptions = {
  canvas: HTMLCanvasElement
  overlay: HTMLElement
  publish: (patch: EnginePatch) => void
  baseUrl?: string
  createRenderer?: (canvas: HTMLCanvasElement) => unknown
}

export type PanelName = 'planets' | 'concorde'
export type BodyCategory = 'planets' | 'comets' | 'stars'
