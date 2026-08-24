import { DELIVERY_PRICE, VAT_RATE, formatPrice, vatIncludedIn } from '../../data/products'
import { cartTotal, orderTotal } from '../../lib/cart'
import type { CartItem } from '../../types/order'
import styles from './OrderTotals.module.css'

type OrderTotalsProps = {
  items: CartItem[]
  variant?: 'panel' | 'inline'
}

export function OrderTotals({ items, variant = 'panel' }: OrderTotalsProps) {
  const subtotal = cartTotal(items)

  return (
    <div className={variant === 'panel' ? styles.panel : styles.inline}>
      <p className={styles.subtotal}>
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </p>
      <p className={styles.detail}>
        <span>VAT ({Math.round(VAT_RATE * 100)}% included)</span>
        <span>{formatPrice(vatIncludedIn(subtotal))}</span>
      </p>
      <p className={styles.detail}>
        <span>Delivery</span>
        <span>{formatPrice(DELIVERY_PRICE)}</span>
      </p>
      <p className={styles.total}>
        <span>Total</span>
        <span>{formatPrice(orderTotal(items))}</span>
      </p>
    </div>
  )
}
