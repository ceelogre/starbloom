import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Header } from '../components/Header/Header'
import { Button } from '../components/Button/Button'
import { StepLayout } from '../components/StepLayout/StepLayout'
import { submitSupportInquiry } from '../lib/support'
import styles from './admin/AdminLoginPage.module.css'

const MESSAGE_MAX = 4000

export function ContactPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    document.title = 'Starbloom — Contact'
    return () => {
      document.title = 'Starbloom'
    }
  }, [])

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && message.trim().length > 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || submitting) {
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      await submitSupportInquiry({ name, email, phone, message })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <Header variant="login" />
      <StepLayout
        title={sent ? 'Message sent' : 'Contact us'}
        subtitle={
          sent
            ? 'Thanks — we have your message and will get back to you.'
            : 'Questions about an order, delivery, or the menu? Send a note and we will reply.'
        }
        actions={
          sent ? (
            <Button variant="secondary" onClick={() => navigate('/')}>
              Back to shop
            </Button>
          ) : (
            <Button type="submit" form="contact-form" disabled={submitting || !canSubmit}>
              {submitting ? 'Sending…' : 'Send message'}
            </Button>
          )
        }
      >
        {error ? <p className={styles.error}>{error}</p> : null}
        {sent ? null : (
          <form
            id="contact-form"
            className={styles.form}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <input
                className={styles.input}
                type="text"
                autoComplete="name"
                name="name"
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Phone <span className={styles.optional}>(optional)</span>
              </span>
              <input
                className={styles.input}
                type="tel"
                autoComplete="tel"
                name="phone"
                maxLength={40}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Message</span>
              <textarea
                className={styles.textarea}
                name="message"
                rows={6}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
              />
            </label>
          </form>
        )}
      </StepLayout>
    </div>
  )
}
