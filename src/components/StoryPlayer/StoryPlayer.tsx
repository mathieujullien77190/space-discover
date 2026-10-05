import { useEffect, useLayoutEffect, useRef } from 'react'
import CabinView from '@/components/CabinView'
import StorySpeed from '@/components/StorySpeed'
import Typewriter from '@/components/Typewriter'
import Button from '@/components/ui/Button'
import { BASE_PATH } from '@/constants'
import { storyOf } from '@/engine/catalog'
import { useStore } from '@/store'
import { quitStory, setFirstPerson, setStorySlowMotion, setStorySpeed, setViewInset, storyNext, storyPrev } from '@/store/commands'
import { FP_OFF_LABEL, FP_ON_LABEL, MOBILE_QUERY, RUNNING_TITLE } from './constants'
import styles from './StoryPlayer.module.css'

// Lecteur d'histoire : un panneau sur le côté droit (en bas sur téléphone) avec le titre, l'image, le texte qui s'écrit et « Suivant » ;
// le moteur centre la scène sur le reste de l'écran (`setViewInset`). La simulation est en pause pendant l'étape.
// À la dernière étape, « Terminer » débloque le haut fait.
export const StoryPlayer = () => {
  const story = useStore((s) => s.story)
  const speed = useStore((s) => s.rocket.speed)
  const firstPerson = useStore((s) => s.firstPerson)
  const effective = useStore((s) => s.rocket.telemetry.eff)
  const slowMotion = useStore((s) => s.slowMotion)
  const unlockAchievement = useStore((s) => s.unlockAchievement)
  const done = useRef(false)
  const panel = useRef<HTMLElement>(null)
  const step = story.step
  const showing = story.active && !!step && (story.phase === 'showing' || step.pause === false)

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

  // la scène se centre sur la zone libre : le panneau prend sa largeur à droite (ou sa hauteur en bas sur téléphone)
  useLayoutEffect(() => {
    const el = panel.current
    if (!story.active || !el) {
      setViewInset(0, 0)
      return
    }
    const apply = () => {
      const r = el.getBoundingClientRect()
      const mobile = typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches
      if (mobile) setViewInset(0, r.height)
      else setViewInset(r.width, 0)
    }
    apply()
    if (typeof ResizeObserver === 'undefined') return () => setViewInset(0, 0)
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      setViewInset(0, 0)
    }
  }, [story.active])

  if (!story.active) return null
  const last = story.index >= story.total - 1
  const fpButton = <Button label={firstPerson ? FP_OFF_LABEL : FP_ON_LABEL} active={firstPerson} title="Regarder autour de soi, comme depuis le satellite (glisser = tourner la tête)" onClick={() => setFirstPerson(!firstPerson)} />
  return (
    <aside ref={panel} className={showing ? styles.panel : `${styles.panel} ${styles.running}`} aria-label={story.title}>
      <div className={styles.head}>
        <span className={styles.progress} aria-label={`Étape ${Math.max(0, story.index) + 1} sur ${story.total}`}>
          {Array.from({ length: story.total }, (_, i) => (
            <i key={i} className={i <= story.index ? styles.dotOn : styles.dot} />
          ))}
        </span>
        <button type="button" className={styles.close} aria-label="Quitter l’histoire" title="Quitter l’histoire" onClick={quitStory}>
          ✕
        </button>
      </div>
      <div className={styles.body}>
        {step ? (
          <>
            <h2 className={styles.title}>{step.title}</h2>
            {step.scene === 'cabin' && <CabinView />}
            {step.image && (
              <figure className={styles.figure}>
                <img src={step.image.src.startsWith('http') ? step.image.src : `${BASE_PATH}/${step.image.src}`} alt={step.image.alt} className={styles.image} />
                <figcaption>
                  {step.image.alt} · {step.image.credit} ({step.image.license})
                </figcaption>
              </figure>
            )}
            <Typewriter key={step.id} className={styles.text} text={step.text} instant={!showing} />
            {step.source && <p className={styles.source}>Source : {step.source}</p>}
          </>
        ) : (
          <h2 className={styles.title}>{RUNNING_TITLE}</h2>
        )}
      </div>
      <div className={styles.foot}>
        <StorySpeed speed={speed} effective={effective} slowMotion={slowMotion} onSlowMotion={setStorySlowMotion} onChange={setStorySpeed} />
        <div className={styles.actions}>
          {fpButton}
          {showing && (
            <button type="button" className={styles.prev} disabled={!story.canPrev} onClick={storyPrev} aria-label="Étape précédente">
              ◀ Précédent
            </button>
          )}
          {showing ? (
            <button type="button" className={styles.next} disabled={!story.canNext} onClick={storyNext}>
              {last ? 'Terminer ✓' : 'Suivant ▶'}
            </button>
          ) : (
            <span className={styles.wait}>{RUNNING_TITLE}</span>
          )}
        </div>
      </div>
    </aside>
  )
}
