import { useEffect, useState } from 'react'
import { CHARS_PER_TICK, TICK_MS } from './constants'
import { prefersReducedMotion } from './helpers'
import styles from './Typewriter.module.css'
import type { TypewriterProps } from './types'

// Texte qui « s'écrit » lettre par lettre ; un clic dessus l'affiche en entier. Le texte complet reste lisible par les lecteurs d'écran.
export const Typewriter = ({ text, className, instant = false }: TypewriterProps) => {
  const skip = instant || prefersReducedMotion()
  const [typed, setTyped] = useState(0)   // le parent met une `key` : un nouveau texte = un nouveau composant, le compteur repart de 0
  useEffect(() => {
    if (skip) return
    const id = setInterval(() => setTyped((c) => (c >= text.length ? c : c + CHARS_PER_TICK)), TICK_MS)
    return () => clearInterval(id)
  }, [text, skip])
  const count = skip ? text.length : typed
  const done = count >= text.length
  return (
    <p className={className} onClick={() => setTyped(text.length)} title={done ? undefined : 'Cliquer pour tout afficher'}>
      <span className={styles.sr}>{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {!done && <span className={styles.cursor}>▍</span>}
      </span>
    </p>
  )
}
