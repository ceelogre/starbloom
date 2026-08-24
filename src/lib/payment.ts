import type { PaymentMethod } from '../types/order'

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cash_on_delivery'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: 'Pay on delivery',
  mobile_money: 'Mobile money',
  card: 'Card',
}

type PaymentMethodOption = {
  id: PaymentMethod
  description: string
  /**
   * Methods that cannot charge yet are still listed so customers know what is
   * on the way. `place_guest_order` rejects them, so this has to stay in step
   * with the `live_methods` array in that function.
   */
  available: boolean
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'cash_on_delivery',
    description: 'Pay the driver in cash when your order arrives.',
    available: true,
  },
  {
    id: 'mobile_money',
    description: 'MTN MoMo and Airtel Money.',
    available: false,
  },
  {
    id: 'card',
    description: 'Visa and Mastercard.',
    available: false,
  },
]
