import { useMemo } from 'react'
import BodyFacts from '@/components/BodyFacts'
import Button from '@/components/ui/Button'
import { BASE_PATH } from '@/constants'
import { bodyCard } from '@/engine/catalog'
import { useStore } from '@/store'
import { alignNorth, alignOrbit } from '@/store/commands'
import styles from './BodyCard.module.css'

// Fiche de l'astre dont on est proche : illustration dessinée + caractéristiques (calculées d'après le JSON de l'astre + quelques faits écrits dedans)
// + deux boutons de vue : « Nord en haut » (pôle nord en haut de l'écran) et « Orbite à plat » (sa trajectoire autour de son corps central à l'horizontale).
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
        {(card.canNorth || card.canOrbit) && (
          <div className={styles.actions}>
            {card.canNorth && <Button label="🧭 Nord en haut" title="Met le pôle nord en haut de l’écran" onClick={() => alignNorth(card.id)} />}
            {card.canOrbit && <Button label="↔ Orbite à plat" title="Montre sa trajectoire autour de son corps central à l’horizontale" onClick={() => alignOrbit(card.id)} />}
          </div>
        )}
      </div>
    </aside>
  )
}
