import type { PaymentMethod } from '../types/order'

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'cash_on_delivery'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: 'Pay on delivery',
}

type PaymentOption = {
  label: string
  description: string
}

export const PAYMENT_METHODS: (PaymentOption & { id: PaymentMethod })[] = [
  {
    id: 'cash_on_delivery',
    label: PAYMENT_METHOD_LABELS.cash_on_delivery,
    description: 'Pay the driver in cash when your order arrives.',
  },
]

/**
 * Advertised in checkout so customers know what is on the way, but the database
 * has no value for these and they cannot be selected. Going live means adding
 * the enum value in Postgres and moving the entry into `PAYMENT_METHODS`.
 */
export const UPCOMING_PAYMENT_METHODS: PaymentOption[] = [
  {
    label: 'Mobile money',
    description: 'MTN MoMo and Airtel Money.',
  },
  {
    label: 'Card',
    description: 'Visa and Mastercard.',
  },
]
