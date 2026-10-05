import { useEffect, useRef } from 'react'
import { NUDGE_FIRST_DELAY_MS, NUDGE_REPEAT_MS } from '@/constants'
import styles from './NudgeButton.module.css'
import type { NudgeButtonProps } from './types'

// Petit bouton de réglage : un appui = un pas ; en maintenant, le pas se répète. Feuille : reçoit tout par props.
export const NudgeButton = ({ label, title, onNudge }: NudgeButtonProps) => {
  const timer = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null)
  const stop = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      clearInterval(timer.current)
      timer.current = null
    }
  }
  useEffect(() => stop, [])
  const start = () => {
    stop()
    onNudge()
    timer.current = setTimeout(() => {
      timer.current = setInterval(onNudge, NUDGE_REPEAT_MS)
    }, NUDGE_FIRST_DELAY_MS)
  }
  return (
    <button type="button" className={styles.button} title={title} onPointerDown={(e) => { e.preventDefault(); start() }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
      {label}
    </button>
  )
}
