import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CABIN_HEIGHT_PX, CABIN_LABEL, CABIN_SPIN_RAD_S } from './constants'
import { buildCabin } from './helpers'
import styles from './CabinView.module.css'
import type { CabinViewProps } from './types'

// Vue 3D de la cabine de Laïka (dessin simplifié) : tourne doucement. Sans WebGL (ou en test) : rien n'est dessiné, la légende reste.
export const CabinView = ({ label = CABIN_LABEL }: CabinViewProps) => {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return   // pas de WebGL : on ne montre que la légende
    }
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
    camera.position.set(0, 1.2, 6.2)
    camera.lookAt(0, -0.1, 0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x44506a, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(3, 4, 5)
    scene.add(sun)
    const cabin = buildCabin()
    scene.add(cabin)
    const resize = () => {
      const w = el.clientWidth || 300
      renderer.setSize(w, CABIN_HEIGHT_PX)
      camera.aspect = w / CABIN_HEIGHT_PX
      camera.updateProjectionMatrix()
    }
    resize()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    el.appendChild(renderer.domElement)
    let raf = 0
    const loop = (now: number) => {
      cabin.rotation.y = Math.sin(now / 1000 * CABIN_SPIN_RAD_S) * 0.9
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])
  return (
    <figure className={styles.figure}>
      <div ref={host} className={styles.canvas} style={{ height: CABIN_HEIGHT_PX }} />
      <figcaption>{label}</figcaption>
    </figure>
  )
}
