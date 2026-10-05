import Button from '@/components/ui/Button'
import { satellites } from '@/engine/catalog'
import { useStore } from '@/store'
import { goIss } from '@/store/commands'

const sats = satellites()

// Un bouton par satellite ; choisir l'ISS allume d'office ses cotes, sa hauteur et sa trajectoire (dans le moteur).
export const SatelliteMenu = () => {
  const mode = useStore((s) => s.view.mode)
  return (
    <>
      {sats.map((s) => (
        <Button key={s.key} label={'🛰 ' + s.name} active={mode === 'iss'} onClick={goIss} />
      ))}
    </>
  )
}
