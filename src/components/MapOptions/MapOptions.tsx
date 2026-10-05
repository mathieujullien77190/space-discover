import { MAP_OPTIONS, MAP_OPTIONS_TITLE } from '@/constants'
import { useStore } from '@/store'
import styles from './MapOptions.module.css'

// Bloc d'options de la carte (en bas à gauche, au-dessus des paramètres de la vue) : cases à cocher, éteintes par défaut.
export const MapOptions = () => {
  const borders = useStore((s) => s.borders)
  const capitals = useStore((s) => s.capitals)
  const toggleBorders = useStore((s) => s.toggleBorders)
  const toggleCapitals = useStore((s) => s.toggleCapitals)
  const state = { borders, capitals }
  const toggle = { borders: toggleBorders, capitals: toggleCapitals }
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
