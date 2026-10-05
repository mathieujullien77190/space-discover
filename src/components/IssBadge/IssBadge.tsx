import { observatoryById } from '@/engine/observatories'
import { useStore } from '@/store'
import styles from './IssBadge.module.css'

// Bandeau « Vue depuis l'ISS » / « Vue depuis l'observatoire » (le nom en texte) : affiché tant qu'on regarde depuis la station ou depuis l'observatoire.
export const IssBadge = () => {
  const issView = useStore((s) => s.issView)
  const { id, view } = useStore((s) => s.observatory)
  const obs = id && view ? observatoryById(id) : null
  if (!issView && !obs) return null
  return (
    <p className={styles.badge} role="status">
      {obs ? `🔭 Vue depuis l’${obs.name.replace(/^Observatoire/, 'observatoire')} · glisse pour regarder autour` : '🛰 Vue depuis l’ISS · glisse pour regarder autour'}
    </p>
  )
}
