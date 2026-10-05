import { storyList } from '@/engine/catalog'
import { useStore } from '@/store'
import { startStory } from '@/store/commands'
import { STORY_LIST_TITLE } from './constants'
import styles from './StoryList.module.css'

// Panneau « Histoires » : une carte par histoire (✓ si le haut fait est débloqué) + collection des hauts faits.
export const StoryList = () => {
  const achievements = useStore((s) => s.achievements)
  const stories = storyList()
  return (
    <div className={styles.list} role="list" aria-label={STORY_LIST_TITLE}>
      {stories.map((st) => {
        const done = !!st.achievement && achievements.includes(st.achievement.id)
        return (
          <button key={st.id} type="button" role="listitem" className={done ? `${styles.card} ${styles.done}` : styles.card} onClick={() => startStory(st.id)}>
            <span className={styles.icon}>{st.icon}</span>
            <span className={styles.name}>
              {st.title} <small>({st.year})</small>
            </span>
            {done && <span className={styles.check} aria-label="Histoire terminée">✓</span>}
          </button>
        )
      })}
      <div className={styles.badges} aria-label="Mes hauts faits">
        {stories.map((st) => {
          if (!st.achievement) return null
          const got = achievements.includes(st.achievement.id)
          return (
            <span key={st.achievement.id} className={got ? styles.badge : `${styles.badge} ${styles.locked}`} title={got ? st.achievement.text : 'À débloquer en finissant l’histoire'}>
              {got ? st.achievement.icon : '🔒'} {got ? st.achievement.title : '???'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
