import { CLOUDS_CREDIT } from '@/engine/clouds'
import { TERRAIN_CREDIT } from '@/engine/contours'
import { MAP_STYLES } from '@/engine/map-tiles'
import { useStore } from '@/store'
import styles from './MapCredit.module.css'

// Crédit obligatoire des fonds de carte en ligne (plan, relief) : affiché tant qu'ils sont choisis.
export const MapCredit = () => {
  const detail = useStore((s) => s.mapDetail)
  const clouds = useStore((s) => s.clouds)
  if (!detail && !clouds) return null
  return (
    <p className={styles.credit}>
      {detail && <>Carte {MAP_STYLES.clean.credit} · {TERRAIN_CREDIT}</>}
      {detail && clouds && ' · '}
      {clouds && CLOUDS_CREDIT}
    </p>
  )
}
