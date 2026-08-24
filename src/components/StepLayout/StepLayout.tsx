import type { ReactNode } from 'react'
import styles from './StepLayout.module.css'

type StepLayoutProps = {
  title: string
  subtitle?: string
  progress?: { current: number; total: number }
  children: ReactNode
  actions?: ReactNode
}

export function StepLayout({
  title,
  subtitle,
  progress,
  children,
  actions,
}: StepLayoutProps) {
  return (
    <section className={styles.step}>
      {progress ? (
        <div className={styles.progress} aria-label={`Step ${progress.current} of ${progress.total}`}>
          {Array.from({ length: progress.total }, (_, index) => (
            <span
              key={index}
              className={[
                styles.progressSeg,
                index < progress.current ? styles.progressSegFilled : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
      ) : null}
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.content}>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  )
}
