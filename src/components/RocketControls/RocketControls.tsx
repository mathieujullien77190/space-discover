import Button from '@/components/ui/Button'
import { ROCKET_SPEEDS } from '@/constants'
import { formatClock } from './helpers'
import type { RocketControlsProps } from './types'

export const RocketControls = ({ T, playing, speed, onSpeed, onStop }: RocketControlsProps) => (
  <>
    <Button label="⏹ Arrêter" onClick={onStop} />
    {ROCKET_SPEEDS.map((s) => (
      <Button key={s.speed} label={s.label} active={playing ? s.speed === speed : s.speed === 0} onClick={() => onSpeed(s.speed)} />
    ))}
    <span>{formatClock(T)}</span>
  </>
)
