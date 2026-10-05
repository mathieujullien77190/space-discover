import Button from '@/components/ui/Button'
import { BODY_CATEGORIES } from '@/constants'
import { viewMenu } from '@/engine/catalog'
import { useStore } from '@/store'
import { selectView } from '@/store/commands'
import styles from './PlanetMenu.module.css'

const items = viewMenu()

// Trois niveaux : catégories (Planètes, Comètes / météorites, Étoiles) ; en dessous, les astres de la catégorie ;
// encore en dessous, les lunes de l'astre choisi (une lune dépend de sa planète : la Lune sous la Terre).
export const PlanetMenu = () => {
  const view = useStore((s) => s.view)
  const category = useStore((s) => s.bodyCategory)
  const setCategory = useStore((s) => s.setBodyCategory)
  const types = BODY_CATEGORIES.find((c) => c.id === category)?.types ?? []
  const bodies = items.filter((b) => types.includes(b.type))
  const selected = view.mode === 'iss' ? undefined : items.find((b) => b.id === view.selected)
  const parentId = selected?.type === 'moon' ? selected.around : selected?.id
  const moons = bodies.some((b) => b.id === parentId) ? items.filter((b) => b.type === 'moon' && b.around === parentId) : []
  return (
    <>
      {BODY_CATEGORIES.map((c) => (
        <Button key={c.id} label={c.label} active={category === c.id} onClick={() => setCategory(c.id)} />
      ))}
      <div className={styles.break} />
      {bodies.map((b) => (
        <Button key={b.id} label={b.label} active={selected?.id === b.id} onClick={() => selectView(b.id)} />
      ))}
      {moons.length > 0 && <div className={styles.break} />}
      {moons.map((b) => (
        <Button key={b.id} label={b.label} active={selected?.id === b.id} onClick={() => selectView(b.id)} />
      ))}
    </>
  )
}
