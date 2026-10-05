import Button from '@/components/ui/Button'
import { CLOUDS_LABEL, EARTH_LABEL, ISS_VIEW_LABELS, PANEL_BUTTONS } from '@/constants'
import { useStore } from '@/store'
import { goIss, selectView } from '@/store/commands'
import styles from './TopBar.module.css'

export const TopBar = () => {
  const panel = useStore((s) => s.panel)
  const togglePanel = useStore((s) => s.togglePanel)
  const clouds = useStore((s) => s.clouds)
  const toggleClouds = useStore((s) => s.toggleClouds)
  const viewMode = useStore((s) => s.view.mode)
  return (
    <div className={styles.bar}>
      {PANEL_BUTTONS.map((b) => (
        <Button key={b.panel} label={b.label} active={panel === b.panel} onClick={() => togglePanel(b.panel)} />
      ))}
      <Button label={EARTH_LABEL} active={viewMode === 'earth'} title="Revenir à la vue Terre (Échap fait la même chose)" onClick={() => selectView('earth')} />
      <Button label={ISS_VIEW_LABELS.go} active={viewMode === 'iss'} title="Aller à l’ISS : la caméra se place tout près de la station" onClick={goIss} />
      <Button label={CLOUDS_LABEL} active={clouds} title="Couverture nuageuse quasi temps réel (satellites, mise à jour toutes les 3 h ; demande internet)" onClick={toggleClouds} />
    </div>
  )
}
