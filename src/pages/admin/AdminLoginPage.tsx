import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Header } from '../../components/Header/Header'
import { Button } from '../../components/Button/Button'
import { StepLayout } from '../../components/StepLayout/StepLayout'
import styles from './AdminLoginPage.module.css'

export function AdminLoginPage() {
  const { session, ready, isStaff, signIn } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from: string }).from.startsWith('/admin')
      ? (location.state as { from: string }).from
      : '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (ready && session) {
    return <Navigate to={isStaff ? from : '/orders'} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <Header variant="login" />
      <StepLayout
        title="Staff login"
        subtitle="Sign in to process deliveries."
        actions={
          <Button type="submit" form="admin-login" disabled={submitting || !email || !password}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        }
      >
        {error ? <p className={styles.error}>{error}</p> : null}
        <form id="admin-login" className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Password</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </form>
      </StepLayout>
    </div>
  )
}
