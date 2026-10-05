import type { EngineState } from '@/types'

export const initialEngineState: EngineState = {
  status: 'loading',
  error: null,
  view: { mode: 'earth', selected: 'earth', align: 'north' },
  info: '',
  viewJson: '',
  time: { simMs: 0, speed: 1, visible: true },
  scale: { widthPx: 100, label: '' },
  story: { active: false, id: null, title: '', index: -1, total: 0, phase: 'running', finished: false, canNext: false, step: null },
  features: {},
  focus: { id: null },
  rocket: { mission: null, running: false, loading: false, message: '', steps: [], components: [], T: 0, playing: false, speed: 0, telemetry: { eff: 1, alt: 0, v: 0 } },
}
