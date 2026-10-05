import { EARTH_OPTIONS } from '@/constants'
import { useStore } from '@/store'
import styles from './EarthOptions.module.css'

// Options de la Terre (dans la fiche de la Terre et dans celle d'un observatoire, en haut à droite) : limites de pays, capitales, observatoires du monde.
// Seuls les observatoires sont cochés au départ.
export const EarthOptions = () => {
  const state = { borders: useStore((s) => s.borders), capitals: useStore((s) => s.capitals), observatories: useStore((s) => s.observatories) }
  const toggle = { borders: useStore((s) => s.toggleBorders), capitals: useStore((s) => s.toggleCapitals), observatories: useStore((s) => s.toggleObservatories) }
  return (
    <div className={styles.box}>
      {EARTH_OPTIONS.map((o) => (
        <label key={o.key} className={styles.option}>
          <input type="checkbox" checked={state[o.key]} onChange={toggle[o.key]} />
          {o.label}
        </label>
      ))}
    </div>
  )
}
