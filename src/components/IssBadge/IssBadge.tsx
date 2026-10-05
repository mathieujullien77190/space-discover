import { useStore } from '@/store'
import styles from './IssBadge.module.css'

// Bandeau « Vue depuis l'ISS » (le nom de la station en texte) : affiché tant qu'on regarde depuis la station.
export const IssBadge = () => {
  const issView = useStore((s) => s.issView)
  if (!issView) return null
  return (
    <p className={styles.badge} role="status">
      🛰 Vue depuis l’ISS · glisse pour regarder autour
    </p>
  )
}
