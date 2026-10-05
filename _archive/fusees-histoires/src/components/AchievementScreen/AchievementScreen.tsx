import { storyList } from '@/engine/catalog'
import { useStore } from '@/store'
import styles from './AchievementScreen.module.css'
import { achievementOf } from './helpers'

// Écran de déblocage : gros badge animé, titre, texte, bouton « Super ! ».
export const AchievementScreen = () => {
  const unlocked = useStore((s) => s.unlocked)
  const dismiss = useStore((s) => s.dismissUnlocked)
  if (!unlocked) return null
  const a = achievementOf(storyList(), unlocked)
  if (!a) return null
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Nouveau haut fait">
      <div className={styles.box}>
        <p className={styles.kicker}>Nouveau haut fait !</p>
        <div className={styles.badge} aria-hidden="true">{a.icon}</div>
        <h2 className={styles.title}>{a.title}</h2>
        <p className={styles.text}>{a.text}</p>
        <button type="button" className={styles.ok} onClick={dismiss} autoFocus>
          Super !
        </button>
      </div>
    </div>
  )
}
