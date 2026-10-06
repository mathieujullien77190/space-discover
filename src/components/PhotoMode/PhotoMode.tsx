import Button from '@/components/ui/Button'
import { useStore } from '@/store'
import { setPhoto, takePhoto } from '@/store/commands'
import styles from './PhotoMode.module.css'

// MODE PHOTO, disponible dans les vues « depuis » (ISS, Hubble, observatoires, site lunaire) : le bouton « 📷 Photo » passe à un objectif à champ étroit (10°, la molette règle de 1° à 30°) avec une netteté maximale
// (résolution du rendu au maximum, tuiles satellite plus fines) ; le viseur s'affiche et « 📸 Prendre la photo » enregistre l'image en PNG.
export const PhotoMode = () => {
  const issView = useStore((s) => s.issView)
  const observatoryView = useStore((s) => s.observatory.view)
  const photo = useStore((s) => s.photo)
  if (!issView && !observatoryView) return null
  return (
    <>
      {photo && (
        <div className={styles.finder} aria-hidden="true">
          <span className={styles.tl} /><span className={styles.tr} /><span className={styles.bl} /><span className={styles.br} />
          <span className={styles.hair} />
        </div>
      )}
      <div className={styles.bar}>
        <Button label="📷 Photo" active={photo} title="Objectif à champ étroit, netteté maximale (molette : zoom de 1° à 30°)" onClick={() => setPhoto(!photo)} />
        {photo && <Button label="📸 Prendre la photo" title="Enregistre l'image en PNG" onClick={takePhoto} />}
      </div>
    </>
  )
}
