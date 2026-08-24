import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { OrderTotals } from '../../components/OrderTotals/OrderTotals'
import { formatPrice } from '../../data/products'
import { fetchMyOrder, formatLineLabel } from '../../lib/orders'
import { formatOrderTime, ORDER_STATUS_LABELS } from '../../lib/order-status'
import { supabase } from '../../lib/supabase'
import type { Order } from '../../types/order'
import styles from '../admin/AdminOrderDetailPage.module.css'

export function CustomerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      return
    }

    let cancelled = false
    setError(null)

    void fetchMyOrder(orderId)
      .then((next) => {
        if (!cancelled) {
          setOrder(next)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this order.')
        }
      })

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => {
          void fetchMyOrder(orderId).then((next) => {
            if (!cancelled) {
              setOrder(next)
            }
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [orderId])

  if (error && !order) {
    return (
      <section className={styles.page}>
        <p className={styles.error}>{error}</p>
        <Link to="/orders" className={styles.back}>
          Back to orders
        </Link>
      </section>
    )
  }

  if (!order) {
    return <p className={styles.muted}>Loading…</p>
  }

  return (
    <section className={styles.page}>
      <Link to="/orders" className={styles.back}>
        Back to orders
      </Link>
      <div className={styles.heading}>
        <h1 className={styles.title}>{order.orderNumber}</h1>
        <p className={styles.muted}>{formatOrderTime(order.createdAt)}</p>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.ticket}>
        <p className={styles.ticketBrand}>Starbloom</p>
        <p className={styles.ticketNumber}>{order.orderNumber}</p>
        <p className={styles.muted}>{formatOrderTime(order.createdAt)}</p>

        <h2 className={styles.sectionTitle}>Delivery</h2>
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
    </section>
  )
}
