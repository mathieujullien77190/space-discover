import { MAP_STYLES } from '@/engine/map-tiles'
import { useStore } from '@/store'
import styles from './MapCredit.module.css'

// Crédit obligatoire des fonds de carte en ligne (plan, relief) : affiché tant qu'ils sont choisis.
export const MapCredit = () => {
  const style = useStore((s) => s.mapStyle)
  if (style === 'drawn') return null
  return <p className={styles.credit}>Fond de carte {MAP_STYLES[style].credit}</p>
}
