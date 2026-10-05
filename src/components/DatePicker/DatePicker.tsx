import { useState } from 'react'
import { formatUtcDate, fromInputValue, toInputValue } from '@/helpers'
import { useStore } from '@/store'
import { setDate } from '@/store/commands'
import styles from './DatePicker.module.css'

// Date simulée (UTC) : un clic ouvre un sélecteur de date et d'heure ; choisir une date « saute » dans le temps (astres, ISS, Lune, missions à leur place de cette date).
export const DatePicker = () => {
  const time = useStore((s) => s.time)
  const [open, setOpen] = useState(false)
  if (!time.simMs) return null
  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.date} title="Choisir une date (saut dans le temps)" onClick={() => setOpen((o) => !o)}>
        📅 {formatUtcDate(time.simMs, time.speed > 1)}
      </button>
      {open && (
        <input
          className={styles.input}
          type="datetime-local"
          aria-label="Date et heure (UTC)"
          defaultValue={toInputValue(time.simMs)}
          onChange={(e) => {
            const ms = fromInputValue(e.target.value)
            if (ms !== null) setDate(ms)
          }}
          onBlur={() => setOpen(false)}
          autoFocus
        />
      )}
    </span>
  )
}
