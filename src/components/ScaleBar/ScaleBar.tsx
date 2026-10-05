import { useStore } from '@/store'
import styles from './ScaleBar.module.css'

export const ScaleBar = () => {
  const scale = useStore((s) => s.scale)
  return (
    <div className={styles.scale}>
      <div className={styles.bar} style={{ width: scale.widthPx }} />
      <div className={styles.label}>{scale.label}</div>
    </div>
  )
}
