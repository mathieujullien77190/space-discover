import { useStore } from '@/store'
import styles from './StatusMessage.module.css'

export const StatusMessage = () => {
  const status = useStore((s) => s.status)
  const error = useStore((s) => s.error)
  if (status === 'error') return <div className={styles.error}>{error}</div>
  if (status === 'loading') return <div className={styles.loading}>Chargement…</div>
  return null
}
