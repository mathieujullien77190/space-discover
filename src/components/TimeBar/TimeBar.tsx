import DatePicker from '@/components/DatePicker'
import Button from '@/components/ui/Button'
import { TIME_SPEEDS } from '@/constants'
import { useStore } from '@/store'
import { resetTime, setSimSpeed } from '@/store/commands'
import styles from './TimeBar.module.css'

export const TimeBar = () => {
  const time = useStore((s) => s.time)
  if (!time.visible) return null
  return (
    <div className={styles.bar}>
      <DatePicker />
      <span className={styles.buttons}>
        {TIME_SPEEDS.map((s) => (
          <Button key={s.speed} label={s.label} active={time.speed === s.speed} onClick={() => setSimSpeed(s.speed)} />
        ))}
        <Button label="⟳" title="Revenir à maintenant" onClick={resetTime} />
      </span>
    </div>
  )
}
