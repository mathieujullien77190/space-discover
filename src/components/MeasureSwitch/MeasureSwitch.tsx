import { useStore } from '@/store'
import { setMetric } from '@/store/commands'
import styles from './MeasureSwitch.module.css'

export const MeasureSwitch = () => {
  const metric = useStore((s) => s.metric)
  return (
    <label className={styles.switch} title="Afficher les tailles réelles (diamètres) du Soleil, de la Lune et de la Terre">
      <input type="checkbox" checked={metric} onChange={(e) => setMetric(e.target.checked)} />
      <span className={styles.track}>
        <span className={styles.icon}>·</span>
        <span className={styles.icon}>📏</span>
        <span className={styles.knob} />
      </span>
    </label>
  )
}
