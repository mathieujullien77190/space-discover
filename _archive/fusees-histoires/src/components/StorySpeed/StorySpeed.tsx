import { SLIDER_STEPS } from './constants'
import { fmtSpeed, posToSpeed, speedToPos } from './helpers'
import styles from './StorySpeed.module.css'
import type { StorySpeedProps } from './types'

// Curseur de la vitesse du temps pendant une histoire (× temps réel, échelle logarithmique).
export const StorySpeed = ({ speed, effective, slowMotion, onSlowMotion, onChange }: StorySpeedProps) => {
  const slowed = effective !== undefined && effective < speed * 0.9   // ralenti à une étape : la vitesse réelle est plus basse que celle du curseur
  return (
    <div className={styles.wrap}>
      <label className={styles.speed}>
        <span>⏱ Vitesse du temps</span>
        <input type="range" min={0} max={SLIDER_STEPS} step={1} value={speedToPos(speed)} aria-label="Vitesse du temps" onChange={(e) => onChange(posToSpeed(Number(e.target.value)))} />
        <output>{fmtSpeed(speed)}</output>
      </label>
      {slowed && <p className={styles.slow} role="status">🐢 Ralenti à cette étape : le temps passe à {fmtSpeed(effective)} (et non {fmtSpeed(speed)})</p>}
      {onSlowMotion && (
        <label className={styles.check}>
          <input type="checkbox" checked={!!slowMotion} onChange={(e) => onSlowMotion(e.target.checked)} />
          Ralenti aux étapes (séparation des boosters…)
        </label>
      )}
    </div>
  )
}
