import Button from '@/components/ui/Button'
import { BIG_VEHICLES_LABEL, CLOUDS_LABEL, ISS_VIEW_LABELS, PANEL_BUTTONS } from '@/constants'
import { useStore } from '@/store'
import { setIssView } from '@/store/commands'
import styles from './TopBar.module.css'

export const TopBar = () => {
  const panel = useStore((s) => s.panel)
  const togglePanel = useStore((s) => s.togglePanel)
  const bigVehicles = useStore((s) => s.bigVehicles)
  const clouds = useStore((s) => s.clouds)
  const toggleClouds = useStore((s) => s.toggleClouds)
  const issShown = useStore((s) => s.issShown)
  const toggleIssShown = useStore((s) => s.toggleIssShown)
  const issView = useStore((s) => s.issView)
  const toggleBigVehicles = useStore((s) => s.toggleBigVehicles)
  return (
    <div className={styles.bar}>
      {PANEL_BUTTONS.map((b) => (
        <Button key={b.panel} label={b.label} active={panel === b.panel} onClick={() => togglePanel(b.panel)} />
      ))}
      <Button label={ISS_VIEW_LABELS.show} active={issShown} title="Afficher ou cacher l’ISS dans la scène (modèle, nom, cotes, trajectoire)" onClick={toggleIssShown} />
      <Button label={issView ? ISS_VIEW_LABELS.off : ISS_VIEW_LABELS.on} active={issView} title="Voir la Terre depuis la station spatiale : glisser pour regarder autour, molette pour le champ" onClick={() => setIssView(!issView)} />
      <Button label={CLOUDS_LABEL} active={clouds} title="Couverture nuageuse quasi temps réel (satellites, mise à jour toutes les 3 h ; demande internet)" onClick={toggleClouds} />
      <Button label={BIG_VEHICLES_LABEL} active={bigVehicles} onClick={toggleBigVehicles} />
    </div>
  )
}
