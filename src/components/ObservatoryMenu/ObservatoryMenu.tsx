import Button from '@/components/ui/Button'
import { OBSERVATORIES } from '@/engine/observatories'
import { useStore } from '@/store'
import { goObservatory } from '@/store/commands'

// Sous-menu « Observatoires » : un bouton par observatoire du monde (aller dessus ; sa fiche propose la vue depuis l'observatoire).
export const ObservatoryMenu = () => {
  const current = useStore((s) => s.observatory.id)
  return (
    <>
      {OBSERVATORIES.map((o) => (
        <Button key={o.id} label={o.short} active={current === o.id} title={'Aller à ' + o.name + ' : la Terre de près, avec le relief ; sa fiche propose la vue depuis l’observatoire'} onClick={() => goObservatory(o.id)} />
      ))}
    </>
  )
}
