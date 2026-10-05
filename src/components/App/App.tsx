import IssBadge from '@/components/IssBadge'
import ObservatoryCard from '@/components/ObservatoryCard'
import MapCredit from '@/components/MapCredit'
import MapOptions from '@/components/MapOptions'
import BodyCard from '@/components/BodyCard'
import EngineHost from '@/components/EngineHost'
import InfoText from '@/components/InfoText'
import ScaleBar from '@/components/ScaleBar'
import StatusMessage from '@/components/StatusMessage'
import SubMenu from '@/components/SubMenu'
import TimeBar from '@/components/TimeBar'
import TopBar from '@/components/TopBar'
import styles from './App.module.css'

export const App = () => (
  <>
    <EngineHost />
    <div className={styles.hud}>
      <TopBar />
      <SubMenu />
      <InfoText />
    </div>
    <BodyCard />
    <ObservatoryCard />
    <TimeBar />
    <div className={styles.bottomLeft}>
      <MapOptions />
      <ScaleBar />
    </div>
    <StatusMessage />
    <MapCredit />
    <IssBadge />
  </>
)
