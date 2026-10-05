import { MAP_OPTIONS, MAP_OPTIONS_TITLE } from '@/constants'
import { useStore } from '@/store'
import styles from './MapOptions.module.css'

// Bloc d'options de la carte (en bas à gauche, au-dessus des paramètres de la vue) : cases à cocher, éteintes par défaut.
// Liées à la planète regardée : le bloc n'existe que pour la Terre (vue Terre, vue ISS, ou la Terre vue depuis le Soleil / la Lune) ; il disparaît devant les autres astres.
export const MapOptions = () => {
  const view = useStore((s) => s.view)
  const borders = useStore((s) => s.borders)
  const capitals = useStore((s) => s.capitals)
  const constellations = useStore((s) => s.constellations)
  const dayNight = useStore((s) => s.dayNight)
  const toggleBorders = useStore((s) => s.toggleBorders)
  const toggleCapitals = useStore((s) => s.toggleCapitals)
  const toggleConstellations = useStore((s) => s.toggleConstellations)
  const toggleDayNight = useStore((s) => s.toggleDayNight)
  const onEarth = view.mode === 'earth' || view.mode === 'iss' || view.selected === 'earth'
  if (!onEarth) return null
  const state = { borders, capitals, constellations, dayNight }
  const toggle = { borders: toggleBorders, capitals: toggleCapitals, constellations: toggleConstellations, dayNight: toggleDayNight }
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
