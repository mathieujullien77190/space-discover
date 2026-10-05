import EngineHost from '@/components/EngineHost'
import InfoText from '@/components/InfoText'
import MeasureSwitch from '@/components/MeasureSwitch'
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
    <MeasureSwitch />
    <TimeBar />
    <ScaleBar />
    <StatusMessage />
  </>
)
