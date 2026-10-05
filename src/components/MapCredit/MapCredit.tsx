import { CLOUDS_CREDIT } from '@/engine/clouds'
import { TERRAIN_CREDIT } from '@/engine/terrain-tiles'
import { useStore } from '@/store'
import styles from './MapCredit.module.css'

// Crédit obligatoire du relief satellite (Esri, AWS) et des nuages : affiché tant qu'ils sont visibles.
export const MapCredit = () => {
  const clouds = useStore((s) => s.clouds)
  const terrain = useStore((s) => s.terrainDetail)
  if (!clouds && !terrain) return null
  return (
    <p className={styles.credit}>
      {terrain && TERRAIN_CREDIT}
      {terrain && clouds && ' · '}
      {clouds && CLOUDS_CREDIT}
    </p>
  )
}
