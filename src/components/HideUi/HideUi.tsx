import { useEffect } from 'react'
import Button from '@/components/ui/Button'
import { useStore } from '@/store'
import { enterFullscreen, exitFullscreen } from './helpers'
import styles from './HideUi.module.css'

// Œil tout seul, tout en haut à gauche, au même style que le bouton « Astres » : un clic CACHE toute l'interface (barre, fiches, options, temps…) et passe en plein écran (comme F11) ;
// un second clic (ou Échap) la remet. Discret quand l'interface est cachée.
export const HideUi = () => {
  const hidden = useStore((s) => s.uiHidden)
  const setUiHidden = useStore((s) => s.setUiHidden)
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && useStore.getState().uiHidden) setUiHidden(false) // sortie du plein écran (Échap, F11) : l'interface revient
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [setUiHidden])
  const toggle = () => {
    if (hidden) {
      setUiHidden(false)
      exitFullscreen()
    } else {
      setUiHidden(true)
      enterFullscreen()
    }
  }
  return (
    <div className={hidden ? `${styles.eye} ${styles.faded}` : styles.eye}>
      <Button label="👁" active={hidden} title={hidden ? 'Afficher l’interface' : 'Cacher l’interface (plein écran)'} onClick={toggle} />
    </div>
  )
}
