import { useStore } from '@/store'
import styles from './IssBadge.module.css'

// Bandeau « Vue depuis l'ISS » / « Vue depuis Hubble » : affiché tant qu'on regarde depuis la station ou le télescope.
// (Plus de bandeau en vue depuis un observatoire : demande de l'utilisateur.)
export const IssBadge = () => {
  const issView = useStore((s) => s.issView)
  const focus = useStore((s) => s.focus.id)
  if (!issView) return null
  return (
    <p className={styles.badge} role="status">
      {(focus === 'hubble' ? '🔭 Vue depuis Hubble' : focus === 'concorde' ? '✈ Vue depuis le Concorde' : '🛰 Vue depuis l’ISS') + ' · glisse pour regarder autour'}
    </p>
  )
}
