import Button from '@/components/ui/Button'
import { issFeatures, satellites } from '@/engine/catalog'
import { useStore } from '@/store'
import { goIss, setFeature } from '@/store/commands'

const sats = satellites()
const features = issFeatures()

export const SatelliteMenu = () => {
  const mode = useStore((s) => s.view.mode)
  const on = useStore((s) => s.features)
  return (
    <>
      {sats.map((s) => (
        <Button key={s.key} label={'🛰 ' + s.name} active={mode === 'iss'} onClick={goIss} />
      ))}
      {features.map((f) => (
        <Button key={f.id} label={f.label} active={!!on[f.id]} onClick={() => setFeature(f.id, !on[f.id])} />
      ))}
    </>
  )
}
