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

/** Hide the payment step while there is only one live method. */
export const SKIP_PAYMENT_STEP = PAYMENT_METHODS.length === 1

/**
 * Kept here so going live is moving the entry into `PAYMENT_METHODS` and adding
 * the enum value in Postgres. Not shown in checkout — unfinished options make
 * the shop look incomplete to first-time visitors.
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
