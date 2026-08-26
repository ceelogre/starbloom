import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Header } from '../components/Header/Header'
import { Button } from '../components/Button/Button'
import { StepLayout } from '../components/StepLayout/StepLayout'
import { CITY, INSTAGRAM_URL, PHONE, WHATSAPP_URL, pageTitle } from '../data/brand'
import { submitSupportInquiry } from '../lib/support'
import formStyles from '../styles/form.module.css'
import styles from './ContactPage.module.css'

const MESSAGE_MAX = 4000

type Channel = { href: string; label: string; detail: string }

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
    document.title = pageTitle('Contact')
    return () => {
      document.title = pageTitle()
    }
  }, [])

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && message.trim().length > 0

  const channels: Channel[] = []
  if (PHONE) {
    channels.push({ href: `tel:${PHONE}`, label: 'Call', detail: PHONE })
  }
  if (WHATSAPP_URL) {
    channels.push({ href: WHATSAPP_URL, label: 'WhatsApp', detail: 'Message us' })
  }
  if (INSTAGRAM_URL) {
    channels.push({ href: INSTAGRAM_URL, label: 'Instagram', detail: 'Send a DM' })
  }

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
    <div className={formStyles.page}>
      <Header variant="login" />
      <StepLayout
        title={sent ? 'Message sent' : 'Contact us'}
        subtitle={
          sent
            ? 'Thanks — we have your message and will get back to you.'
            : `Questions about an order, delivery, or the menu? We pack in ${CITY} and reply as soon as we can.`
        }
        actions={
          sent ? (
            <Button
              variant="secondary"
              onClick={() => navigate('/', { state: { start: 'category' } })}
            >
              Back to shop
            </Button>
          ) : (
            <Button type="submit" form="contact-form" disabled={submitting || !canSubmit}>
              {submitting ? 'Sending…' : 'Send message'}
            </Button>
          )
        }
      >
        {error ? <p className={formStyles.error}>{error}</p> : null}
        {sent ? null : (
          <>
            {channels.length > 0 ? (
              <ul className={styles.channels}>
                {channels.map((channel) => (
                  <li key={channel.href}>
                    <a
                      className={styles.channel}
                      href={channel.href}
                      rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                      target={channel.href.startsWith('http') ? '_blank' : undefined}
                    >
                      <span className={styles.channelLabel}>{channel.label}</span>
                      <span className={styles.channelDetail}>{channel.detail}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              id="contact-form"
              className={formStyles.form}
              onSubmit={(event) => void handleSubmit(event)}
            >
              <label className={formStyles.field}>
                <span className={formStyles.fieldLabel}>Name</span>
                <input
                  className={formStyles.input}
                  type="text"
                  autoComplete="name"
                  name="name"
                  maxLength={200}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              <label className={formStyles.field}>
                <span className={formStyles.fieldLabel}>Email</span>
                <input
                  className={formStyles.input}
                  type="email"
                  autoComplete="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className={formStyles.field}>
                <span className={formStyles.fieldLabel}>
                  Phone <span className={formStyles.optional}>(optional)</span>
                </span>
                <input
                  className={formStyles.input}
                  type="tel"
                  autoComplete="tel"
                  name="phone"
                  maxLength={40}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <label className={formStyles.field}>
                <span className={formStyles.fieldLabel}>Message</span>
                <textarea
                  className={formStyles.textarea}
                  name="message"
                  rows={6}
                  maxLength={MESSAGE_MAX}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                />
              </label>
            </form>
          </>
        )}
      </StepLayout>
    </div>
  )
}
