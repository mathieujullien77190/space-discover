import Button from '@/components/ui/Button'
import { viewMenu } from '@/engine/catalog'
import { useStore } from '@/store'
import { selectView } from '@/store/commands'

const items = viewMenu()

export const PlanetMenu = () => {
  const view = useStore((s) => s.view)
  return (
    <>
      {items.map((b) => (
        <Button key={b.id} label={b.label} active={view.mode !== 'iss' && view.selected === b.id} onClick={() => selectView(b.id)} />
      ))}
    </>
  )
}
