import { SLIDER_STEPS } from './constants'
import { fmtSpeed, posToSpeed, speedToPos } from './helpers'
import styles from './StorySpeed.module.css'
import type { StorySpeedProps } from './types'

// Curseur de la vitesse du temps pendant une histoire (× temps réel, échelle logarithmique).
export const StorySpeed = ({ speed, onChange }: StorySpeedProps) => (
  <label className={styles.speed}>
    <span>⏱ Vitesse du temps</span>
    <input type="range" min={0} max={SLIDER_STEPS} step={1} value={speedToPos(speed)} aria-label="Vitesse du temps" onChange={(e) => onChange(posToSpeed(Number(e.target.value)))} />
    <output>{fmtSpeed(speed)}</output>
  </label>
)
