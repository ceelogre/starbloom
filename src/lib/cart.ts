import { DELIVERY_PRICE, SAUSAGE_LABEL } from '../data/products'
import type { CartItem } from '../types/order'

export function formatCartItem(item: CartItem) {
  if (item.category === 'meat') {
    return `${item.productName} — ${item.quantity} kg`
  }

  const packLabel = item.quantity === 1 ? 'pack' : 'packs'
  return `${SAUSAGE_LABEL} — ${item.quantity} ${packLabel}`
}

export function lineTotal(item: CartItem) {
  return item.quantity * item.unitPrice
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0)
}

export function orderTotal(items: CartItem[]) {
  return cartTotal(items) + DELIVERY_PRICE
}
