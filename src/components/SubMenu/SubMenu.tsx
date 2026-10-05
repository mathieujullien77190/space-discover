import ObservatoryMenu from '@/components/ObservatoryMenu'
import PlanetMenu from '@/components/PlanetMenu'
import { useStore } from '@/store'
import styles from './SubMenu.module.css'

export const SubMenu = () => {
  const panel = useStore((s) => s.panel)
  if (panel !== 'planets' && panel !== 'observatories') return null
  return (
    <div className={styles.row}>
      {panel === 'planets' ? <PlanetMenu /> : <ObservatoryMenu />}
    </div>
  )
}
