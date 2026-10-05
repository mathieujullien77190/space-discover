import Button from '@/components/ui/Button'
import { satellites } from '@/engine/catalog'
import { useStore } from '@/store'
import { goIss, selectView } from '@/store/commands'

const sats = satellites()

// Satellites et sondes : l'ISS (choisie, elle allume d'office ses cotes et sa trajectoire) puis les sondes rejouées d'après l'histoire (Voyager, Pioneer, New Horizons).
// Un objet n'est cliquable qu'à partir de sa date d'existence : l'ISS depuis 1998, une sonde depuis son lancement (la date se règle dans la barre de temps).
export const SatelliteMenu = () => {
  const view = useStore((s) => s.view)
  const simMs = useStore((s) => s.time.simMs)
  return (
    <>
      {sats.map((s) => {
        const exists = !simMs || simMs >= s.from
        const active = s.kind === 'iss' ? view.mode === 'iss' : view.selected === s.key
        return (
          <Button
            key={s.key}
            label={'🛰 ' + s.name}
            active={active}
            disabled={!exists}
            title={exists ? undefined : `Pas encore lancé à cette date (${new Date(s.from).getUTCFullYear()})`}
            onClick={() => (s.kind === 'iss' ? goIss() : selectView(s.key))}
          />
        )
      })}
    </>
  )
}
