import RocketControls from '@/components/RocketControls'
import Button from '@/components/ui/Button'
import { missionLaunches, rocketList } from '@/engine/catalog'
import { useStore } from '@/store'
import { followMission, launchMission, setRocketSpeed, startRocket, stopRocket } from '@/store/commands'

const rockets = rocketList()
const missions = missionLaunches()

export const RocketMenu = () => {
  const rocket = useStore((s) => s.rocket)
  if (rocket.running) return <RocketControls T={rocket.T} playing={rocket.playing} speed={rocket.speed} onSpeed={setRocketSpeed} onStop={stopRocket} onFollow={rocket.mission ? followMission : undefined} />
  return (
    <>
      {rockets.map((r) => (
        <Button key={r.key} label={r.label} disabled={rocket.loading} onClick={() => startRocket(r.key)} />
      ))}
      {missions.map((m) => (
        <Button key={m.key} label={m.label} title="Saute à la date du lancement et lance la fusée" disabled={rocket.loading} onClick={() => launchMission(m.key)} />
      ))}
      {rocket.loading && <span>⏳ Chargement des modèles 3D…</span>}
      {rocket.message && <span>{rocket.message}</span>}
    </>
  )
}
