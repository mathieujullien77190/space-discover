import BodyCard from '@/components/BodyCard'
import EngineHost from '@/components/EngineHost'
import InfoText from '@/components/InfoText'
import ScaleBar from '@/components/ScaleBar'
import StatusMessage from '@/components/StatusMessage'
import SubMenu from '@/components/SubMenu'
import TimeBar from '@/components/TimeBar'
import TopBar from '@/components/TopBar'
import ViewParams from '@/components/ViewParams'
import styles from './App.module.css'

export const App = () => (
  <>
    <EngineHost />
    <div className={styles.hud}>
      <TopBar />
      <SubMenu />
      <BodyCard />
      <InfoText />
    </div>
    <TimeBar />
    <div className={styles.bottomLeft}>
      <ViewParams />
      <ScaleBar />
    </div>
    <StatusMessage />
  </>
)
