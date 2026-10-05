import { MAP_OPTIONS, MAP_OPTIONS_TITLE } from '@/constants'
import { useStore } from '@/store'
import styles from './MapOptions.module.css'

// Bloc GÉNÉRAL d'options du ciel (en bas à gauche, dans toutes les vues) : Infos étoiles et Constellations, éteintes par défaut.
// (Limites de pays, capitales et observatoires sont dans la fiche de la Terre / d'un observatoire, en haut à droite ; « Jour / nuit » est dans la barre du haut.)
export const MapOptions = () => {
  const starInfo = useStore((s) => s.starInfo)
  const toggleStarInfo = useStore((s) => s.toggleStarInfo)
  const constellations = useStore((s) => s.constellations)
  const toggleConstellations = useStore((s) => s.toggleConstellations)
  const metric = useStore((s) => s.metric)
  const toggleMetric = useStore((s) => s.toggleMetric)
  const state = { starInfo, constellations, metric }
  const toggle = { starInfo: toggleStarInfo, constellations: toggleConstellations, metric: toggleMetric }
  return (
    <fieldset className={styles.box}>
      <legend className={styles.title}>{MAP_OPTIONS_TITLE}</legend>
      {MAP_OPTIONS.map((o) => (
        <label key={o.key} className={styles.option}>
          <input type="checkbox" checked={state[o.key]} onChange={toggle[o.key]} />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
