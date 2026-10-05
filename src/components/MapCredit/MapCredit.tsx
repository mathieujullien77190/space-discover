import { CLOUDS_CREDIT } from '@/engine/clouds'
import { useStore } from '@/store'
import styles from './MapCredit.module.css'

// Crédit obligatoire des fonds de carte en ligne (plan, relief) : affiché tant qu'ils sont choisis.
export const MapCredit = () => {
  const clouds = useStore((s) => s.clouds)
  if (!clouds) return null
  return <p className={styles.credit}>{CLOUDS_CREDIT}</p>
}
