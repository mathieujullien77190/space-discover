import { useMemo } from 'react'
import BodyFacts from '@/components/BodyFacts'
import Button from '@/components/ui/Button'
import { BASE_PATH } from '@/constants'
import { bodyCard } from '@/engine/catalog'
import { useStore } from '@/store'
import { alignNorth, alignOrbit, resetUp } from '@/store/commands'
import styles from './BodyCard.module.css'

// Fiche de l'astre choisi : illustration dessinée + caractéristiques (calculées d'après le JSON de l'astre + quelques faits écrits dedans)
// + deux boutons de vue à bascule : « Nord en haut » et « Orbite à plat ». Réductible en un mini bouton-icône (l'illustration de l'astre) : un clic la rouvre ; le choix est mémorisé.
export const BodyCard = () => {
  const id = useStore((s) => s.focus.id)
  const align = useStore((s) => s.view.align)
  const collapsed = useStore((s) => s.cardCollapsed)
  const setCollapsed = useStore((s) => s.setCardCollapsed)
  const card = useMemo(() => (id ? bodyCard(id) : null), [id])
  if (!card) return null
  const picture = `${BASE_PATH}/${card.image}`
  if (collapsed) {
    return (
      <button type="button" className={styles.mini} aria-label={`Afficher la fiche : ${card.name}`} title={`Afficher la fiche : ${card.name}`} onClick={() => setCollapsed(false)}>
        <img className={styles.miniPicture} src={picture} alt="" width={40} height={40} />
      </button>
    )
  }
  return (
    <aside className={styles.card} aria-label={`Fiche : ${card.name}`}>
      <img className={styles.picture} src={picture} alt={card.name} width={96} height={96} />
      <div className={styles.text}>
        <h2 className={styles.name}>{card.name}</h2>
        <div className={styles.kind}>{card.kind}</div>
        <BodyFacts facts={card.facts} />
        {(card.canNorth || card.canOrbit) && (
          <div className={styles.actions}>
            {card.canNorth && <Button label="🧭 Nord en haut" active={align === 'north'} title="Met le pôle nord en haut de l’écran (activé : revient à la verticale du monde)" onClick={() => (align === 'north' ? resetUp() : alignNorth(card.id))} />}
            {card.canOrbit && <Button label="↔ Orbite à plat" active={align === 'orbit'} title="Montre sa trajectoire autour de son corps central à l’horizontale (activé : revient à « Nord en haut »)" onClick={() => (align === 'orbit' ? alignNorth(card.id) : alignOrbit(card.id))} />}
          </div>
        )}
      </div>
      <button type="button" className={styles.reduce} aria-label="Réduire la fiche" title="Réduire la fiche en icône" onClick={() => setCollapsed(true)}>
        ▾
      </button>
    </aside>
  )
}
