import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatOrderTime } from '../../lib/order-status'
import { pageTitle } from '../../data/brand'
import { supabase } from '../../lib/supabase'
import { fetchInquiries, INQUIRY_STATUS_LABELS, previewMessage } from '../../lib/support'
import type { InquiryStatus, SupportInquiry } from '../../types/support'
import styles from './AdminInboxPage.module.css'

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) {
      return
    }
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.06
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.14)
    void ctx.close()
  } catch {
    /* Audio may be blocked until a user gesture. */
  }
}

export function AdminSupportPage() {
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([])
  const [status, setStatus] = useState<InquiryStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unseen, setUnseen] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      const next = await fetchInquiries({ status, search })
      setInquiries(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inquiries.')
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel('admin-support')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_inquiries' },
        (payload) => {
          setUnseen((count) => count + 1)
          playBeep()
          const name = (payload.new as { name?: string }).name
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('New Starbloom inquiry', {
              body: name ? `${name} sent a message.` : 'Someone just sent a support message.',
            })
          }
          void load()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_inquiries' },
        () => {
          void load()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    document.title = unseen > 0 ? `(${unseen}) ${pageTitle('Support')}` : pageTitle('Support')
    return () => {
      document.title = pageTitle()
    }
  }, [unseen])

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') {
      return
    }
    void Notification.requestPermission()
  }, [])

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1 className={styles.title}>Support</h1>
          <p className={styles.muted}>Open a message to reply, mark it read, or close it.</p>
        </div>
        {unseen > 0 ? (
          <button type="button" className={styles.badge} onClick={() => setUnseen(0)}>
            {unseen} new
          </button>
        ) : null}
      </div>

      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault()
          setLoading(true)
          void load()
        }}
      >
        <label className={styles.filter}>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as InquiryStatus | 'all')}
          >
            <option value="all">All</option>
            {(Object.keys(INQUIRY_STATUS_LABELS) as InquiryStatus[]).map((key) => (
              <option key={key} value={key}>
                {INQUIRY_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filter}>
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email, or phone"
          />
        </label>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.muted}>Loading…</p> : null}

      {!loading && inquiries.length === 0 ? (
        <p className={styles.muted}>No inquiries match these filters.</p>
      ) : (
        <ul className={styles.list}>
          {inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <Link to={`/admin/support/${inquiry.id}`} className={styles.row}>
                <div>
                  <p className={styles.orderNumber}>{inquiry.name}</p>
                  <p className={styles.meta}>
                    {inquiry.email}
                    {inquiry.phone ? ` · ${inquiry.phone}` : ''}
                  </p>
                  <p className={styles.preview}>{previewMessage(inquiry.message)}</p>
                </div>
                <div className={styles.rowEnd}>
                  <span className={styles.status}>{INQUIRY_STATUS_LABELS[inquiry.status]}</span>
                  <span className={styles.time}>{formatOrderTime(inquiry.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
