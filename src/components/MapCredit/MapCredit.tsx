import { CLOUDS_CREDIT } from '@/engine/clouds'
import { MAP_STYLES } from '@/engine/map-tiles'
import { useStore } from '@/store'
import styles from './MapCredit.module.css'

// Crédit obligatoire des fonds de carte en ligne (plan, relief) : affiché tant qu'ils sont choisis.
export const MapCredit = () => {
  const style = useStore((s) => s.mapStyle)
  const clouds = useStore((s) => s.clouds)
  if (style === 'drawn' && !clouds) return null
  return (
    <p className={styles.credit}>
      {style !== 'drawn' && <>Fond de carte {MAP_STYLES[style].credit}</>}
      {style !== 'drawn' && clouds && ' · '}
      {clouds && CLOUDS_CREDIT}
    </p>
  )
}
