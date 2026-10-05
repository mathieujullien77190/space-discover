import PlanetMenu from '@/components/PlanetMenu'
import RocketMenu from '@/components/RocketMenu'
import SatelliteMenu from '@/components/SatelliteMenu'
import StoryList from '@/components/StoryList'
import { useStore } from '@/store'
import styles from './SubMenu.module.css'

export const SubMenu = () => {
  const panel = useStore((s) => s.panel)
  if (!panel) return null
  return (
    <div className={styles.row}>
      {panel === 'planets' && <PlanetMenu />}
      {panel === 'satellites' && <SatelliteMenu />}
      {panel === 'rockets' && <RocketMenu />}
      {panel === 'stories' && <StoryList />}
    </div>
  )
}
