import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatPrice } from '../../data/products'
import { fetchMyOrders } from '../../lib/orders'
import { formatOrderTime, ORDER_STATUS_LABELS } from '../../lib/order-status'
import { supabase } from '../../lib/supabase'
import type { Order } from '../../types/order'
import styles from '../admin/AdminInboxPage.module.css'

export function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      setOrders(await fetchMyOrders())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel('my-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void load()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Your orders</h1>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.muted}>Loading…</p> : null}

      {!loading && orders.length === 0 ? (
        <p className={styles.muted}>
          No orders on this account yet. Place an order while signed in to track it here.
        </p>
      ) : (
        <ul className={styles.list}>
          {orders.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className={styles.row}>
                <div>
                  <p className={styles.orderNumber}>{order.orderNumber}</p>
                  <p className={styles.meta}>{order.address}</p>
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
