import NudgeButton from '@/components/NudgeButton'
import { NUDGE_STEPS } from '@/constants'
import { useStore } from '@/store'
import { nudge } from '@/store/commands'
import { NUDGE_CONTROLS } from './constants'
import { copyText } from './helpers'
import styles from './ViewParams.module.css'

// Paramètres de la vue courante (JSON à copier-coller pour régler les vues) + réglage fin : cap, pitch, distance, pas.
export const ViewParams = () => {
  const viewJson = useStore((s) => s.viewJson)
  const step = useStore((s) => s.nudgeStep)
  const cycleStep = useStore((s) => s.cycleNudgeStep)
  return (
    <div className={styles.box}>
      <div>
        <b>Vue</b>{' '}
        <button type="button" className={styles.small} onClick={() => copyText(viewJson)}>
          📋 Copier
        </button>
      </div>
      <code className={styles.json}>{viewJson}</code>
      <div className={styles.nudge}>
        {NUDGE_CONTROLS.map((g) => (
          <span key={g.name}>
            {g.name}{' '}
            {g.buttons.map((b) => (
              <NudgeButton key={b.kind} label={b.label} onNudge={() => nudge(b.kind)} />
            ))}{' '}
          </span>
        ))}
        pas{' '}
        <button type="button" className={styles.small} onClick={cycleStep}>
          {NUDGE_STEPS[step]}°
        </button>
      </div>
    </div>
  )
}
