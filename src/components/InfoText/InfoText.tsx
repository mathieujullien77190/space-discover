import { useStore } from '@/store'
import styles from './InfoText.module.css'

export const InfoText = () => {
  const info = useStore((s) => s.info)
  return <div className={styles.info}>{info}</div>
}
