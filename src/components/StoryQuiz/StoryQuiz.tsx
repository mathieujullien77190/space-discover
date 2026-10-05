import { useState } from 'react'
import styles from './StoryQuiz.module.css'
import type { StoryQuizProps } from './types'

// Quiz à deux choix : on choisit une réponse, puis on voit si elle est bonne et une courte explication (jamais de punition : une mauvaise réponse est un « presque »).
export const StoryQuiz = ({ question, choices, explain }: StoryQuizProps) => {
  const [picked, setPicked] = useState<number | null>(null)
  const good = picked !== null && !!choices[picked].correct
  return (
    <div className={styles.quiz}>
      <p className={styles.question}>{question}</p>
      <div className={styles.choices}>
        {choices.map((c, i) => {
          const state = picked === null ? '' : c.correct ? styles.right : i === picked ? styles.almost : styles.faded
          return (
            <button key={c.text} type="button" className={`${styles.choice} ${state}`} disabled={picked !== null} onClick={() => setPicked(i)}>
              {c.text}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <p className={styles.feedback} role="status">
          {good ? '🎉 Bravo ! ' : '🙂 Presque ! '}
          {explain}
        </p>
      )}
    </div>
  )
}
