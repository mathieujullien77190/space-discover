import styles from './Button.module.css'
import type { ButtonProps } from './types'

const Button = ({ label, active = false, disabled = false, title, onClick }: ButtonProps) => (
  <button type="button" className={active ? `${styles.button} ${styles.on}` : styles.button} disabled={disabled} title={title} onClick={onClick}>
    {label}
  </button>
)

export default Button
