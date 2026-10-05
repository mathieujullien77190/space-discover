import Button from '@/components/ui/Button'
import { ROCKET_SPEEDS } from '@/constants'
import { formatClock } from './helpers'
import type { RocketControlsProps } from './types'

export const RocketControls = ({ T, playing, speed, onSpeed, onStop, onFollow }: RocketControlsProps) => (
  <>
    <Button label="⏹ Arrêter" onClick={onStop} />
    {ROCKET_SPEEDS.map((s) => (
      <Button key={s.speed} label={s.label} active={playing ? s.speed === speed : s.speed === 0} onClick={() => onSpeed(s.speed)} />
    ))}
    {onFollow && <Button label="🛰 Suivre la sonde" title="Quitte la fusée et suit la sonde dans l’espace (le temps file à 1 jour par seconde)" onClick={onFollow} />}
    <span>{formatClock(T)}</span>
  </>
)
