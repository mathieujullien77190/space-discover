import { useEffect, useState } from 'react'
import styles from './TileCache.module.css'

type Stats = { bytes: number; max: number; count: number }

// Barre en haut : taille du dossier tiles/ (serveur de tuiles local, dev seulement) sur son plafond de 1 Go. Absente si le serveur ne répond pas.
export const TileCache = () => {
  const [st, setSt] = useState<Stats | null>(null)
  useEffect(() => {
    if (typeof location === 'undefined' || location.port !== '5179') return
    let alive = true
    const poll = () => fetch(`http://${location.hostname}:5180/stats`).then((r) => r.json()).then((s: Stats) => { if (alive) setSt(s) }).catch(() => { if (alive) setSt(null) })
    poll()
    const id = setInterval(poll, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [])
  if (!st) return null
  const pct = Math.min(100, (st.bytes / st.max) * 100)
  return (
    <div className={styles.box} title={`${st.count} tuiles dans tiles/`}>
      <span>{`Tuiles : ${Math.round(st.bytes / 1048576)} Mo / ${Math.round(st.max / 1048576)} Mo`}</span>
      <div className={styles.bar}><div className={styles.fill} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
