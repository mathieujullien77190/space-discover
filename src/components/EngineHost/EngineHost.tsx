import { useEffect, useRef } from 'react'
import { BASE_PATH, DEV_START, DEV_START_DELAY_MS } from '@/constants'
import { createEngine } from '@/engine/app'
import { useStore } from '@/store'
import styles from './EngineHost.module.css'

// Seul pont entre React et le moteur 3D : crée le moteur sur le canvas, lui donne le canal de publication (le store) et range ses commandes dans le store.
export const EngineHost = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay) return
    const { applyPatch, setEngine } = useStore.getState()
    const engine = createEngine({ canvas, overlay, publish: applyPatch, baseUrl: BASE_PATH })
    if (!engine) return
    setEngine(engine)
    const dev = DEV_START
    const start = dev && setTimeout(() => { engine.setDate(dev.ms); engine.goObservatory(dev.observatory); engine.setObservatoryView(true) }, DEV_START_DELAY_MS)   // démarrage de test : Pic du Midi, vue depuis l'observatoire, 12 août 2026 à 17 h UTC
    return () => {
      if (start) clearTimeout(start)
      engine.dispose()
      setEngine(null)
    }
  }, [])
  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div ref={overlayRef} className={styles.overlay} />
    </>
  )
}
