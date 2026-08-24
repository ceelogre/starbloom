import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/Button/Button'
import { OrderTotals } from '../../components/OrderTotals/OrderTotals'
import { formatPrice } from '../../data/products'
import {
  cancelOrder,
  fetchOrder,
  formatLineLabel,
  markOrderPaid,
  updateOrderStatus,
} from '../../lib/orders'
import { formatOrderTime, nextStatus, ORDER_STATUS_LABELS } from '../../lib/order-status'
import type { Order } from '../../types/order'
import styles from './AdminOrderDetailPage.module.css'

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  async function reload() {
    if (!orderId) {
      return
    }
    const next = await fetchOrder(orderId)
    setOrder(next)
    setCancelReason(next.cancelledReason ?? '')
  }

  useEffect(() => {
    if (!orderId) {
      return
    }

    let cancelled = false
    setError(null)

    void fetchOrder(orderId)
      .then((next) => {
        if (!cancelled) {
          setOrder(next)
          setCancelReason(next.cancelledReason ?? '')
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this order.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [orderId])

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

  if (error && !order) {
    return (
      <section className={styles.page}>
        <p className={styles.error}>{error}</p>
        <Link to="/admin" className={styles.back}>
          Back to inbox
        </Link>
      </section>
    )
  }

  if (!order) {
    return <p className={styles.muted}>Loading…</p>
  }

  const upcoming = nextStatus(order.status)
  const canCancel = order.status !== 'cancelled' && order.status !== 'delivered'

  return (
    <section className={styles.page}>
      <div className={styles.screenOnly}>
        <Link to="/admin" className={styles.back}>
          Back to inbox
        </Link>
        <div className={styles.heading}>
          <h1 className={styles.title}>{order.orderNumber}</h1>
          <p className={styles.muted}>{formatOrderTime(order.createdAt)}</p>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      <div className={styles.ticket}>
        <p className={styles.ticketBrand}>Starbloom</p>
        <p className={styles.ticketNumber}>{order.orderNumber}</p>
        <p className={styles.muted}>{formatOrderTime(order.createdAt)}</p>

        <h2 className={styles.sectionTitle}>Customer</h2>
        <p className={styles.value}>{order.customerName}</p>
        <p className={styles.muted}>{order.phone}</p>
        <p className={styles.muted}>{order.address}</p>
        {order.instructions.trim() ? (
          <p className={styles.muted}>Notes: {order.instructions}</p>
        ) : null}

        <h2 className={styles.sectionTitle}>Items</h2>
        <ul className={styles.lines}>
          {order.items.map((line) => (
            <li key={line.id}>
              <span>{formatLineLabel(line)}</span>
              <span>{formatPrice(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <OrderTotals
          money={{
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            vatAmount: order.vatAmount,
            total: order.total,
          }}
          variant="inline"
        />

        <p className={styles.statusLine}>
          {ORDER_STATUS_LABELS[order.status]}
          {order.paymentStatus === 'paid' ? ' · Paid' : ' · Unpaid (COD)'}
        </p>
        {order.cancelledReason ? (
          <p className={styles.muted}>Cancelled: {order.cancelledReason}</p>
        ) : null}
      </div>

      <div className={styles.actions}>
        {upcoming ? (
          <Button
            disabled={busy}
            onClick={() => void run(() => updateOrderStatus(order.id, upcoming))}
          >
            Mark {ORDER_STATUS_LABELS[upcoming].toLowerCase()}
          </Button>
        ) : null}
        {order.paymentStatus === 'unpaid' && order.status !== 'cancelled' ? (
          <Button variant="secondary" disabled={busy} onClick={() => void run(() => markOrderPaid(order.id))}>
            Mark paid
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => window.print()}>
          Print ticket
        </Button>
        {canCancel ? (
          <Button variant="secondary" disabled={busy} onClick={() => setShowCancel((open) => !open)}>
            Cancel order
          </Button>
        ) : null}
      </div>

      {showCancel && canCancel ? (
        <form
          className={styles.cancelForm}
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await cancelOrder(order.id, cancelReason)
              setShowCancel(false)
            })
          }}
        >
          <label className={styles.field}>
            <span>Cancel reason</span>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy || cancelReason.trim().length === 0}>
            Confirm cancel
          </Button>
        </form>
      ) : null}
    </section>
  )
}
