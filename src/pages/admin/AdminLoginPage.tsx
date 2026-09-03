import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../../components/Button/Button'
import { StepLayout } from '../../components/StepLayout/StepLayout'
import { pageTitle } from '../../data/brand'
import styles from '../../styles/form.module.css'

export function AdminLoginPage() {
  const { session, ready, isStaff, signIn, signOut } = useAuth()
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

  useEffect(() => {
    document.title = pageTitle('Staff login')
    return () => {
      document.title = pageTitle()
    }
  }, [])

  if (ready && session && isStaff) {
    return <Navigate to={from} replace />
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
      <StepLayout
        title="Staff login"
        subtitle="Sign in to process deliveries."
        actions={
          ready && session && !isStaff ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void signOut()
              }}
            >
              Sign out
            </Button>
          ) : (
            <Button type="submit" form="admin-login" disabled={submitting || !email || !password}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          )
        }
      >
        {error ? <p className={styles.error}>{error}</p> : null}
        {ready && session && !isStaff ? (
          <p className={styles.error}>
            This account is signed in, but it is not a staff profile. Promote it in Supabase
            (`profiles.role = 'staff'`), then sign in again.
          </p>
        ) : null}
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
