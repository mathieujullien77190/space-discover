import type { EngineState } from '@/types'

export const initialEngineState: EngineState = {
  status: 'loading',
  error: null,
  view: { mode: 'earth', selected: 'earth', align: 'north' },
  info: '',
  viewJson: '',
  observatory: { id: null, view: false },
  star: { hip: null },
  time: { simMs: 0, speed: 1, visible: true },
  scale: { widthPx: 100, label: '' },
  features: {},
  focus: { id: null },
}
