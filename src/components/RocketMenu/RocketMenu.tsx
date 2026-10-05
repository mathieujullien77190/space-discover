import RocketControls from '@/components/RocketControls'
import Button from '@/components/ui/Button'
import { rocketList } from '@/engine/catalog'
import { useStore } from '@/store'
import { setRocketSpeed, startRocket, stopRocket } from '@/store/commands'

const rockets = rocketList()

export const RocketMenu = () => {
  const rocket = useStore((s) => s.rocket)
  if (rocket.running) return <RocketControls T={rocket.T} playing={rocket.playing} speed={rocket.speed} onSpeed={setRocketSpeed} onStop={stopRocket} />
  return (
    <>
      {rockets.map((r) => (
        <Button key={r.key} label={r.label} disabled={rocket.loading} onClick={() => startRocket(r.key)} />
      ))}
      {rocket.loading && <span>⏳ Chargement des modèles 3D…</span>}
      {rocket.message && <span>{rocket.message}</span>}
    </>
  )
}
