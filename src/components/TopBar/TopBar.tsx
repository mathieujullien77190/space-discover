import Button from '@/components/ui/Button'
import { BIG_VEHICLES_LABEL, ISS_VIEW_LABELS, MAP_LABELS, PANEL_BUTTONS } from '@/constants'
import { useStore } from '@/store'
import { setIssView } from '@/store/commands'
import styles from './TopBar.module.css'

export const TopBar = () => {
  const panel = useStore((s) => s.panel)
  const togglePanel = useStore((s) => s.togglePanel)
  const bigVehicles = useStore((s) => s.bigVehicles)
  const issView = useStore((s) => s.issView)
  const mapStyle = useStore((s) => s.mapStyle)
  const toggleMapStyle = useStore((s) => s.toggleMapStyle)
  const toggleBigVehicles = useStore((s) => s.toggleBigVehicles)
  return (
    <div className={styles.bar}>
      {PANEL_BUTTONS.map((b) => (
        <Button key={b.panel} label={b.label} active={panel === b.panel} onClick={() => togglePanel(b.panel)} />
      ))}
      <Button label={issView ? ISS_VIEW_LABELS.off : ISS_VIEW_LABELS.on} active={issView} title="Voir la Terre depuis la station spatiale : glisser pour regarder autour, molette pour le champ" onClick={() => setIssView(!issView)} />
      <Button label={MAP_LABELS[mapStyle]} active={mapStyle !== 'drawn'} title="Fond de carte : dessiné → plan (routes, villes) → relief (forêts, montagnes) ; plan et relief demandent internet et s'affichent sous 900 km d'altitude" onClick={toggleMapStyle} />
      <Button label={BIG_VEHICLES_LABEL} active={bigVehicles} onClick={toggleBigVehicles} />
    </div>
  )
}
