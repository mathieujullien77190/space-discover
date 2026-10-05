import Button from '@/components/ui/Button'
import { CLOUDS_LABEL, DAY_NIGHT_LABEL, EARTH_LABEL, ISS_VIEW_LABELS, PANEL_BUTTONS, REALISTIC_LABEL } from '@/constants'
import { useStore } from '@/store'
import { goHubble, goIss, selectView } from '@/store/commands'
import styles from './TopBar.module.css'

export const TopBar = () => {
  const panel = useStore((s) => s.panel)
  const togglePanel = useStore((s) => s.togglePanel)
  const clouds = useStore((s) => s.clouds)
  const toggleClouds = useStore((s) => s.toggleClouds)
  const realistic = useStore((s) => s.realistic)
  const toggleRealistic = useStore((s) => s.toggleRealistic)
  const dayNight = useStore((s) => s.dayNight)
  const toggleDayNight = useStore((s) => s.toggleDayNight)
  const viewMode = useStore((s) => s.view.mode)
  const focus = useStore((s) => s.focus.id)
  return (
    <div className={styles.bar}>
      {PANEL_BUTTONS.map((b) => (
        <Button key={b.panel} label={b.label} active={panel === b.panel} onClick={() => togglePanel(b.panel)} />
      ))}
      <Button label={EARTH_LABEL} active={viewMode === 'earth'} title="Revenir à la vue Terre (Échap fait la même chose)" onClick={() => selectView('earth')} />
      <Button label={ISS_VIEW_LABELS.go} active={viewMode === 'iss' && focus !== 'hubble'} title="Aller à l’ISS : la caméra se place tout près de la station" onClick={goIss} />
      <Button label={ISS_VIEW_LABELS.hubble} active={viewMode === 'iss' && focus === 'hubble'} title="Aller au télescope spatial Hubble : la caméra se place tout près" onClick={goHubble} />
      <Button label={CLOUDS_LABEL} active={clouds} title="Couverture nuageuse quasi temps réel (satellites, mise à jour toutes les 3 h ; demande internet)" onClick={toggleClouds} />
      <Button label={DAY_NIGHT_LABEL} active={dayNight} title="Jour / nuit : le vrai Soleil éclaire, la face cachée est sombre (décoché : tout est éclairé de face)" onClick={toggleDayNight} />
      <Button label={REALISTIC_LABEL} active={realistic} title="Vue réaliste : retire les trajectoires, les noms, les repères et tout ce qui n’existe pas dans la réalité" onClick={toggleRealistic} />
    </div>
  )
}
