import { DELIVERY_PRICE, SAUSAGE_LABEL, vatIncludedIn } from '../data/products'
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

export const MAX_LINE_QUANTITY = 10

export function isSameProduct(a: CartItem, b: CartItem) {
  if (a.category !== b.category) {
    return false
  }

  if (a.category === 'meat' && b.category === 'meat') {
    return a.productId === b.productId
  }

  return true
}

export function mergeCartItem(cart: CartItem[], incoming: CartItem): CartItem[] {
  const index = cart.findIndex((item) => isSameProduct(item, incoming))

  if (index === -1) {
    return [...cart, incoming]
  }

  return cart.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item
    }

    const quantity = Math.min(MAX_LINE_QUANTITY, roundQuantity(item.quantity + incoming.quantity))
    return { ...item, quantity } as CartItem
  })
}

export function adjustCartQuantity(cart: CartItem[], itemId: string, delta: number): CartItem[] {
  return cart.flatMap((item) => {
    if (item.id !== itemId) {
      return [item]
    }

    const quantity = roundQuantity(item.quantity + delta)

    if (quantity < (item.unit === 'kg' ? 0.5 : 1)) {
      return []
    }

    return [{ ...item, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } as CartItem]
  })
}

function roundQuantity(value: number) {
  return Math.round(value * 2) / 2
}

export function moneyFromCart(items: CartItem[]) {
  const subtotal = cartTotal(items)
  return {
    subtotal,
    deliveryFee: DELIVERY_PRICE,
    vatAmount: vatIncludedIn(subtotal),
    total: orderTotal(items),
  }
}
