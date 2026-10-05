import Button from '@/components/ui/Button'
import { BODY_CATEGORIES } from '@/constants'
import { viewMenu } from '@/engine/catalog'
import { useStore } from '@/store'
import { selectView } from '@/store/commands'
import styles from './PlanetMenu.module.css'

const items = viewMenu()

// Premier niveau : catégories (Planètes, Comètes / météorites, Étoiles) ; second niveau, en dessous : les astres de la catégorie choisie.
export const PlanetMenu = () => {
  const view = useStore((s) => s.view)
  const category = useStore((s) => s.bodyCategory)
  const setCategory = useStore((s) => s.setBodyCategory)
  const types = BODY_CATEGORIES.find((c) => c.id === category)?.types ?? []
  return (
    <>
      {BODY_CATEGORIES.map((c) => (
        <Button key={c.id} label={c.label} active={category === c.id} onClick={() => setCategory(c.id)} />
      ))}
      <div className={styles.break} />
      {items
        .filter((b) => types.includes(b.type))
        .map((b) => (
          <Button key={b.id} label={b.label} active={view.mode !== 'iss' && view.selected === b.id} onClick={() => selectView(b.id)} />
        ))}
    </>
  )
}
