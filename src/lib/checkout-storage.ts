import type { CartItem, DeliveryDetails, PaymentMethod } from '../types/order'

const CART_KEY = 'starbloom.cart'
const CONFIRMATION_KEY = 'starbloom.confirmation'

export type ConfirmationSnapshot = {
  orderId: string
  orderNumber: string
  delivery: DeliveryDetails
  paymentMethod: PaymentMethod
  items: CartItem[]
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function loadStoredCart(): CartItem[] {
  const items = readJson<CartItem[]>(localStorage, CART_KEY)
  return Array.isArray(items) ? items : []
}

export const CART_CHANGED_EVENT = 'starbloom:cart'

export function saveStoredCart(cart: CartItem[]) {
  try {
    if (cart.length === 0) {
      localStorage.removeItem(CART_KEY)
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    }
  } catch {
    /* Private mode may block localStorage. */
  }

  window.dispatchEvent(new Event(CART_CHANGED_EVENT))
}

export function loadConfirmation(): ConfirmationSnapshot | null {
  const snapshot = readJson<ConfirmationSnapshot>(sessionStorage, CONFIRMATION_KEY)
  if (!snapshot?.orderNumber || !Array.isArray(snapshot.items)) {
    return null
  }

  return snapshot
}

export function saveConfirmation(snapshot: ConfirmationSnapshot) {
  try {
    sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(snapshot))
  } catch {
    /* Private mode may block sessionStorage. */
  }
}

export function clearConfirmation() {
  try {
    sessionStorage.removeItem(CONFIRMATION_KEY)
  } catch {
    /* Ignore. */
  }
}
