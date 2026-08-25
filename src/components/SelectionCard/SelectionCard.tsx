import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './SelectionCard.module.css'

type SelectionCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  description?: string
  icon?: ReactNode
  /** Marks the choice already made, for steps you can come back to. */
  selected?: boolean
}

export function SelectionCard({
  label,
  description,
  icon,
  selected,
  className,
  ...props
}: SelectionCardProps) {
  const classes = [styles.card, selected ? styles.selected : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} aria-pressed={selected} {...props}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.label}>{label}</span>
      {description ? <span className={styles.description}>{description}</span> : null}
    </button>
  )
}
