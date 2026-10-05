import Button from '@/components/ui/Button'
import { CONCORDE_FLIGHTS } from '@/constants'
import { useStore } from '@/store'
import { flyConcorde, goConcorde } from '@/store/commands'

// Sous-menu « Concorde » : un bouton par vol programmé (AF002 Paris → New York, AF001 New York → Paris) : on saute à la date du vol (2 juin 2003, 2 min après le décollage), l'horloge passe à 1 min par seconde
// et la caméra se place sur l'avion ; « Voir le Concorde » le retrouve s'il vole déjà à la date simulée.
export const ConcordeMenu = () => {
  const focus = useStore((s) => s.focus.id)
  const viewMode = useStore((s) => s.view.mode)
  return (
    <>
      {CONCORDE_FLIGHTS.map((f) => (
        <Button key={f.id} label={f.label} active={viewMode === 'iss' && focus === 'concorde'} title={`Vol ${f.id} : arrivée prévue ${f.arrival} ; saute au 2 juin 2003, 2 minutes après le décollage`} onClick={() => flyConcorde(f.id)} />
      ))}
      <Button label="🔎 Voir le Concorde" title="Va sur le Concorde s'il vole à la date simulée" onClick={goConcorde} />
    </>
  )
}
