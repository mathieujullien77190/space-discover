import BodyFacts from '@/components/BodyFacts'
import Button from '@/components/ui/Button'
import { BASE_PATH } from '@/constants'
import { observatoryById } from '@/engine/observatories'
import { useStore } from '@/store'
import { setObservatoryView } from '@/store/commands'
import { OBS_VIEW_LABELS } from './constants'
import styles from './ObservatoryCard.module.css'

// Fiche de l'observatoire choisi (comme celle de l'ISS) : illustration, faits, et le bouton « Vue depuis l'observatoire » (regarder le ciel et l'horizon en glissant).
export const ObservatoryCard = () => {
  const { id, view } = useStore((s) => s.observatory)
  const obs = id ? observatoryById(id) : null
  if (!obs) return null
  return (
    <aside className={styles.card} aria-label={`Fiche : ${obs.name}`}>
      <img className={styles.picture} src={`${BASE_PATH}/${obs.image}`} alt={obs.name} width={96} height={96} />
      <div className={styles.text}>
        <h2 className={styles.name}>{obs.name}</h2>
        <div className={styles.kind}>{obs.kind}</div>
        <BodyFacts facts={obs.facts} />
        <p className={styles.note}>{obs.note}</p>
        <div className={styles.actions}>
          <Button label={view ? OBS_VIEW_LABELS.off : OBS_VIEW_LABELS.on} active={view} title="Se placer à l’observatoire et regarder le ciel et l’horizon : glisser pour tourner la tête, molette pour le champ" onClick={() => setObservatoryView(!view)} />
        </div>
      </div>
    </aside>
  )
}
