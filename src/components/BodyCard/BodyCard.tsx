import { useMemo } from 'react'
import BodyFacts from '@/components/BodyFacts'
import { BASE_PATH } from '@/constants'
import { bodyCard } from '@/engine/catalog'
import { useStore } from '@/store'
import styles from './BodyCard.module.css'

// Fiche de l'astre dont on est proche : illustration dessinée + caractéristiques (calculées d'après le JSON de l'astre + quelques faits écrits dedans).
export const BodyCard = () => {
  const id = useStore((s) => s.focus.id)
  const card = useMemo(() => (id ? bodyCard(id) : null), [id])
  if (!card) return null
  return (
    <aside className={styles.card} aria-label={`Fiche : ${card.name}`}>
      <img className={styles.picture} src={`${BASE_PATH}/${card.image}`} alt={card.name} width={96} height={96} />
      <div className={styles.text}>
        <h2 className={styles.name}>{card.name}</h2>
        <div className={styles.kind}>{card.kind}</div>
        <BodyFacts facts={card.facts} />
      </div>
    </aside>
  )
}
