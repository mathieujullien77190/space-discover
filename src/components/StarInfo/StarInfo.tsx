import { useMemo } from 'react'
import BodyFacts from '@/components/BodyFacts'
import { starByHip, starDetails } from '@/engine/star-info'
import { useStore } from '@/store'
import { clearStar } from '@/store/commands'
import styles from './StarInfo.module.css'

// Fiche de l'étoile cliquée (option « Infos étoiles ») : nom, désignation, constellation, éclat, couleur, température et un bref descriptif.
export const StarInfo = () => {
  const hip = useStore((s) => s.star.hip)
  const details = useMemo(() => {
    const row = hip === null ? null : starByHip(hip)
    return row ? starDetails(row) : null
  }, [hip])
  if (!details) return null
  const facts = [
    { label: 'Constellation', value: details.constellation || 'inconnue ici' },
    { label: 'Magnitude', value: String(details.magnitude).replace('.', ',') },
    { label: 'Couleur', value: details.colorClass },
    { label: 'Température', value: '≈ ' + details.tempK.toLocaleString('fr-FR') + ' K' },
  ]
  return (
    <aside className={styles.card} aria-label={`Étoile : ${details.title}`}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.name}>{details.title}</h2>
          <div className={styles.sub}>{details.subtitle}</div>
        </div>
        <button type="button" className={styles.close} aria-label="Fermer la fiche de l’étoile" onClick={clearStar}>
          ✕
        </button>
      </div>
      <BodyFacts facts={facts} />
      <p className={styles.text}>{details.text}</p>
      <p className={styles.note}>{details.note}</p>
    </aside>
  )
}
