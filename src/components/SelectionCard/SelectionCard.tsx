import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './SelectionCard.module.css'

type SelectionCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  description?: string
  icon?: ReactNode
}

export function SelectionCard({
  label,
  description,
  icon,
  className,
  ...props
}: SelectionCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ')

  return (
    <button type="button" className={classes} {...props}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.label}>{label}</span>
      {description ? <span className={styles.description}>{description}</span> : null}
    </button>
  )
}
