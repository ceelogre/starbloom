import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/Button/Button'
import { formatOrderTime } from '../../lib/order-status'
import { fetchInquiry, INQUIRY_STATUS_LABELS, updateInquiryStatus } from '../../lib/support'
import type { SupportInquiry } from '../../types/support'
import styles from './AdminSupportDetailPage.module.css'

export function AdminSupportDetailPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>()
  const [inquiry, setInquiry] = useState<SupportInquiry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const markedRead = useRef<string | null>(null)

  async function reload() {
    if (!inquiryId) {
      return
    }
    const next = await fetchInquiry(inquiryId)
    setInquiry(next)
  }

  useEffect(() => {
    if (!inquiryId) {
      return
    }

    let cancelled = false
    setError(null)
    markedRead.current = null

    void fetchInquiry(inquiryId)
      .then(async (next) => {
        if (cancelled) {
          return
        }
        setInquiry(next)
        if (next.status === 'new' && markedRead.current !== next.id) {
          markedRead.current = next.id
          await updateInquiryStatus(next.id, 'read')
          if (!cancelled) {
            setInquiry(await fetchInquiry(next.id))
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this inquiry.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [inquiryId])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !inquiry) {
    return (
      <section className={styles.page}>
        <p className={styles.error}>{error}</p>
        <Link to="/admin/support" className={styles.back}>
          Back to support
        </Link>
      </section>
    )
  }

  if (!inquiry) {
    return <p className={styles.muted}>Loading…</p>
  }

  return (
    <section className={styles.page}>
      <Link to="/admin/support" className={styles.back}>
        Back to support
      </Link>
      <div className={styles.heading}>
        <h1 className={styles.title}>{inquiry.name}</h1>
        <p className={styles.muted}>{formatOrderTime(inquiry.createdAt)}</p>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>From</h2>
        <p className={styles.value}>{inquiry.name}</p>
        <p className={styles.muted}>
          <a className={styles.contactLink} href={`mailto:${inquiry.email}`}>
            {inquiry.email}
          </a>
        </p>
        {inquiry.phone ? (
          <p className={styles.muted}>
            <a className={styles.contactLink} href={`tel:${inquiry.phone}`}>
              {inquiry.phone}
            </a>
          </p>
        ) : null}

        <h2 className={styles.sectionTitle}>Message</h2>
        <p className={styles.message}>{inquiry.message}</p>

        <p className={styles.statusLine}>{INQUIRY_STATUS_LABELS[inquiry.status]}</p>
      </div>

      <div className={styles.actions}>
        {inquiry.status === 'new' ? (
          <Button disabled={busy} onClick={() => void run(() => updateInquiryStatus(inquiry.id, 'read'))}>
            Mark read
          </Button>
        ) : null}
        {inquiry.status !== 'closed' ? (
          <Button
            variant={inquiry.status === 'new' ? 'secondary' : 'primary'}
            disabled={busy}
            onClick={() => void run(() => updateInquiryStatus(inquiry.id, 'closed'))}
          >
            Close
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => updateInquiryStatus(inquiry.id, 'read'))}
          >
            Reopen
          </Button>
        )}
      </div>

      <div>
        <h2 className={styles.sectionTitle}>Staff email</h2>
        {inquiry.emailSentAt ? (
          <p className={styles.muted}>Sent {formatOrderTime(inquiry.emailSentAt)}</p>
        ) : inquiry.emailError ? (
          <p className={styles.failed}>{inquiry.emailError}</p>
        ) : (
          <p className={styles.muted}>Nothing sent yet. Staff are emailed when a message arrives.</p>
        )}
      </div>
    </section>
  )
}
