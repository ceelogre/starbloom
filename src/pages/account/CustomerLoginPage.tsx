import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { Header } from '../../components/Header/Header'
import { Button } from '../../components/Button/Button'
import { StepLayout } from '../../components/StepLayout/StepLayout'
import styles from '../admin/AdminLoginPage.module.css'

export function CustomerLoginPage() {
  const { session, ready, signInWithMagicLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from: string }).from.startsWith('/orders')
      ? (location.state as { from: string }).from
      : '/orders'

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  if (ready && session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signInWithMagicLink(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a sign-in link.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <Header variant="account" />
      <StepLayout
        title="Track your order"
        subtitle={
          sent
            ? `We sent a sign-in link to ${email.trim()}. Open it on this device.`
            : 'We’ll email you a sign-in link. Guest checkout still works without an account.'
        }
        actions={
          sent ? (
            <Button variant="secondary" onClick={() => navigate('/')}>
              Back to shop
            </Button>
          ) : (
            <Button type="submit" form="customer-login" disabled={submitting || !email}>
              {submitting ? 'Sending…' : 'Send sign-in link'}
            </Button>
          )
        }
      >
        {error ? <p className={styles.error}>{error}</p> : null}
        {sent ? null : (
          <form
            id="customer-login"
            className={styles.form}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
          </form>
        )}
      </StepLayout>
    </div>
  )
}
