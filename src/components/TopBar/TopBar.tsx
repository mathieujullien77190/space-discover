import Button from '@/components/ui/Button'
import { PANEL_BUTTONS } from '@/constants'
import { useStore } from '@/store'
import styles from './TopBar.module.css'

export const TopBar = () => {
  const panel = useStore((s) => s.panel)
  const togglePanel = useStore((s) => s.togglePanel)
  return (
    <div className={styles.bar}>
      {PANEL_BUTTONS.map((b) => (
        <Button key={b.panel} label={b.label} active={panel === b.panel} onClick={() => togglePanel(b.panel)} />
      ))}
    </div>
  )
}
