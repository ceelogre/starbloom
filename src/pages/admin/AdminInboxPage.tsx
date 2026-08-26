import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { formatPrice } from '../../data/products'
import { pageTitle } from '../../data/brand'
import { rememberAdminInboxSearch } from '../../lib/admin-inbox'
import { fetchOrders } from '../../lib/orders'
import { formatOrderTime, ORDER_STATUS_LABELS } from '../../lib/order-status'
import { supabase } from '../../lib/supabase'
import type { Order, OrderStatus } from '../../types/order'
import styles from './AdminInboxPage.module.css'

const STATUS_KEYS = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

function parseStatus(value: string | null): OrderStatus | 'all' {
  if (value && STATUS_KEYS.includes(value as OrderStatus)) {
    return value as OrderStatus
  }

  return 'all'
}

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

export function AdminInboxPage() {
  const [params, setParams] = useSearchParams()
  const status = parseStatus(params.get('status'))
  const phone = params.get('phone') ?? ''
  const fromDate = params.get('from') ?? ''
  const toDate = params.get('to') ?? ''
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unseen, setUnseen] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      const next = await fetchOrders({ status, phone, fromDate, toDate })
      setOrders(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [status, phone, fromDate, toDate])

  useEffect(() => {
    rememberAdminInboxSearch(params.toString() ? `?${params.toString()}` : '')
  }, [params])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          setUnseen((count) => count + 1)
          playBeep()
          const number = (payload.new as { order_number?: string }).order_number
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('New Starbloom order', {
              body: number ? `Order ${number}` : 'A guest just placed an order.',
            })
          }
          void load()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
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
    document.title = unseen > 0 ? `(${unseen}) ${pageTitle('Orders')}` : pageTitle('Orders')
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

  function patchFilters(updates: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    }
    setParams(next, { replace: true })
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.muted}>Open an order to update status, mark paid, cancel, or print a ticket.</p>
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
            onChange={(event) =>
              patchFilters({
                status: event.target.value === 'all' ? '' : event.target.value,
              })
            }
          >
            <option value="all">All</option>
            {STATUS_KEYS.map((key) => (
              <option key={key} value={key}>
                {ORDER_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filter}>
          <span>Phone</span>
          <input
            type="search"
            value={phone}
            onChange={(event) => patchFilters({ phone: event.target.value })}
            placeholder="Search phone"
          />
        </label>
        <label className={styles.filter}>
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => patchFilters({ from: event.target.value })}
          />
        </label>
        <label className={styles.filter}>
          <span>To</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => patchFilters({ to: event.target.value })}
          />
        </label>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.muted}>Loading…</p> : null}

      {!loading && orders.length === 0 ? (
        <p className={styles.muted}>No orders match these filters.</p>
      ) : (
        <ul className={styles.list}>
          {orders.map((order) => (
            <li key={order.id}>
              <Link to={`/admin/orders/${order.id}`} className={styles.row}>
                <div>
                  <p className={styles.orderNumber}>{order.orderNumber}</p>
                  <p className={styles.meta}>
                    {order.customerName} · {order.phone}
                  </p>
                </div>
                <div className={styles.rowEnd}>
                  <span className={styles.status}>{ORDER_STATUS_LABELS[order.status]}</span>
                  {order.paymentStatus === 'unpaid' ? (
                    <span className={styles.unpaid}>Unpaid</span>
                  ) : (
                    <span className={styles.paid}>Paid</span>
                  )}
                  <span className={styles.total}>{formatPrice(order.total)}</span>
                  <span className={styles.time}>{formatOrderTime(order.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
