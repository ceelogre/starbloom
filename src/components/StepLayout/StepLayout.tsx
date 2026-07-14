import type { ReactNode } from 'react'
import styles from './StepLayout.module.css'

type StepLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
}

export function StepLayout({ title, subtitle, children, actions }: StepLayoutProps) {
  return (
    <section className={styles.step}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.content}>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  )
}
