import HideUi from "@/components/HideUi";
import IssBadge from "@/components/IssBadge";
import ObservatoryCard from "@/components/ObservatoryCard";
import PhotoMode from "@/components/PhotoMode";
import MapCredit from "@/components/MapCredit";
import MapOptions from "@/components/MapOptions";
import BodyCard from "@/components/BodyCard";
import EngineHost from "@/components/EngineHost";
import InfoText from "@/components/InfoText";
import ScaleBar from "@/components/ScaleBar";
import StatusMessage from "@/components/StatusMessage";
import StarInfo from "@/components/StarInfo";
import SubMenu from "@/components/SubMenu";
import TimeBar from "@/components/TimeBar";
import TopBar from "@/components/TopBar";
import { useStore } from "@/store";
import styles from "./App.module.css";

export const App = () => {
  const uiHidden = useStore((s) => s.uiHidden);
  return (
    <>
      <EngineHost />
      <HideUi />
      {!uiHidden && (
        <>
          <div className={styles.hud}>
            <TopBar />
            <SubMenu />
            <InfoText />
          </div>
          <BodyCard />
          <ObservatoryCard />
          <StarInfo />
          <TimeBar />
          <div className={styles.bottomLeft}>
            <MapOptions />
            <ScaleBar />
          </div>
          <StatusMessage />
          <MapCredit />
          <IssBadge />
          <PhotoMode />
        </>
      )}
    </>
  );
};
