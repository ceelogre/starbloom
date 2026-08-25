import { VAT_RATE, formatPrice } from '../../data/products'
import { moneyFromCart } from '../../lib/cart'
import type { CartItem } from '../../types/order'
import styles from './OrderTotals.module.css'

export type OrderMoney = {
  subtotal: number
  deliveryFee: number
  vatAmount: number
  total: number
}

type OrderTotalsProps = {
  items?: CartItem[]
  money?: OrderMoney
  variant?: 'panel' | 'inline'
}

export function OrderTotals({ items, money, variant = 'panel' }: OrderTotalsProps) {
  const amounts = money ?? (items ? moneyFromCart(items) : null)

  if (!amounts) {
    return null
  }

  return (
    <div className={variant === 'panel' ? styles.panel : styles.inline}>
      <p className={styles.subtotal}>
        <span>Subtotal</span>
        <span>{formatPrice(amounts.subtotal)}</span>
      </p>
      <p className={styles.detail}>
        <span>VAT ({Math.round(VAT_RATE * 100)}% included)</span>
        <span>{formatPrice(amounts.vatAmount)}</span>
      </p>
      <p className={styles.detail}>
        <span>Delivery</span>
        <span>{formatPrice(amounts.deliveryFee)}</span>
      </p>
      <p className={styles.total}>
        <span>Total</span>
        <span>{formatPrice(amounts.total)}</span>
      </p>
    </div>
  )
}
