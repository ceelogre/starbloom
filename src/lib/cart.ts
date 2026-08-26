import { DELIVERY_PRICE, formatQuantity, quantityStepFor, vatIncludedIn } from '../data/products'
import type { Product } from '../types/catalog'
import type { CartItem } from '../types/order'

export const MAX_LINE_QUANTITY = 10

export function formatCartItem(item: CartItem) {
  return `${item.productName} (${item.variantLabel}) — ${formatQuantity(item.quantity, item.unit)}`
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

/** How much of a variant a customer may still add, stock and cap included. */
export function maxQuantityFor(item: Pick<CartItem, 'stockLimit'>) {
  if (item.stockLimit === null) {
    return MAX_LINE_QUANTITY
  }

  return Math.min(MAX_LINE_QUANTITY, item.stockLimit)
}

export function mergeCartItem(cart: CartItem[], incoming: CartItem): CartItem[] {
  const index = cart.findIndex((item) => item.variantId === incoming.variantId)

  if (index === -1) {
    return [...cart, incoming]
  }

  return cart.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item
    }

    return {
      ...item,
      quantity: Math.min(maxQuantityFor(item), roundQuantity(item.quantity + incoming.quantity)),
    }
  })
}

export function adjustCartQuantity(cart: CartItem[], itemId: string, delta: number): CartItem[] {
  return cart.flatMap((item) => {
    if (item.id !== itemId) {
      return [item]
    }

    const quantity = roundQuantity(item.quantity + delta)

    if (quantity < quantityStepFor(item.unit)) {
      return []
    }

    return [{ ...item, quantity: Math.min(maxQuantityFor(item), quantity) }]
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

/** Drop lines the catalog can no longer sell, and cap quantities to stock. */
export function pruneCart(cart: CartItem[], catalog: Product[]): CartItem[] {
  return cart.flatMap((item) => {
    const product = catalog.find((entry) => entry.id === item.productId && entry.isActive)
    const variant = product?.variants.find((entry) => entry.id === item.variantId && entry.isActive)

    if (!product || !variant) {
      return []
    }

    const stockLimit = variant.trackStock ? variant.stockQuantity : null
    if (stockLimit !== null && stockLimit <= 0) {
      return []
    }

    const quantity = Math.min(item.quantity, maxQuantityFor({ stockLimit }))
    if (quantity < quantityStepFor(variant.unit)) {
      return []
    }

    return [
      {
        ...item,
        productName: product.name,
        variantLabel: variant.label,
        unit: variant.unit,
        unitPrice: variant.price,
        stockLimit,
        quantity,
      },
    ]
  })
}
