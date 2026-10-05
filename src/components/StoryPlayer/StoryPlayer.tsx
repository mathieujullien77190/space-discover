import { useEffect, useRef } from 'react'
import { BASE_PATH } from '@/constants'
import { storyOf } from '@/engine/catalog'
import { useStore } from '@/store'
import { quitStory, storyNext } from '@/store/commands'
import styles from './StoryPlayer.module.css'

// Lecteur d'histoire : une étape = un grand texte, une image éventuelle, un gros bouton « Suivant ». La simulation est en pause pendant l'étape.
// À la dernière étape, « Terminer » débloque le haut fait.
export const StoryPlayer = () => {
  const story = useStore((s) => s.story)
  const unlockAchievement = useStore((s) => s.unlockAchievement)
  const done = useRef(false)
  const step = story.step
  const shown = story.active && !!step && (story.phase === 'showing' || step.pause === false)

  useEffect(() => {
    if (!story.active || !story.finished || done.current) return
    done.current = true
    const def = storyOf(story.id ?? '') as { achievement?: { id: string } } | null
    if (def?.achievement) unlockAchievement(def.achievement.id)   // haut fait débloqué à la dernière étape
    quitStory()
  }, [story.active, story.finished, story.id, unlockAchievement])

  useEffect(() => {
    if (!story.active) done.current = false
  }, [story.active])

  if (!story.active) return null
  if (!shown || !step) {
    return (
      <div className={styles.running} role="status">
        <span>🚀 Suivons la fusée…</span>
        <button type="button" className={styles.close} aria-label="Quitter l’histoire" title="Quitter l’histoire" onClick={quitStory}>
          ✕
        </button>
      </div>
    )
  }
  const last = story.index >= story.total - 1
  return (
    <section className={styles.player} aria-label={story.title}>
      <div className={styles.head}>
        <span className={styles.progress} aria-label={`Étape ${story.index + 1} sur ${story.total}`}>
          {Array.from({ length: story.total }, (_, i) => (
            <i key={i} className={i <= story.index ? styles.dotOn : styles.dot} />
          ))}
        </span>
        <button type="button" className={styles.close} aria-label="Quitter l’histoire" title="Quitter l’histoire" onClick={quitStory}>
          ✕
        </button>
      </div>
      <h2 className={styles.title}>{step.title}</h2>
      {step.image && (
        <figure className={styles.figure}>
          <img src={step.image.src.startsWith('http') ? step.image.src : `${BASE_PATH}/${step.image.src}`} alt={step.image.alt} className={styles.image} />
          <figcaption>
            {step.image.alt} · {step.image.credit} ({step.image.license})
          </figcaption>
        </figure>
      )}
      <p className={styles.text}>{step.text}</p>
      {step.source && <p className={styles.source}>Source : {step.source}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.next} disabled={!story.canNext} onClick={storyNext}>
          {last ? 'Terminer ✓' : 'Suivant ▶'}
        </button>
      </div>
    </section>
  )
}
