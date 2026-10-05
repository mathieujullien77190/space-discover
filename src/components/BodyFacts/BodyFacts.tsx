import styles from './BodyFacts.module.css'
import type { BodyFactsProps } from './types'

// Liste « libellé : valeur » (feuille : tout vient des props).
export const BodyFacts = ({ facts }: BodyFactsProps) => (
  <dl className={styles.list}>
    {facts.map((f) => (
      <div key={f.label} className={styles.row}>
        <dt className={styles.label}>{f.label}</dt>
        <dd className={styles.value}>{f.value}</dd>
      </div>
    ))}
  </dl>
)
