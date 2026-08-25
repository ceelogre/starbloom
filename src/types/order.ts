export type Category = 'meat' | 'sausage'

export type OrderStep =
  | 'home'
  | 'category'
  | 'product'
  | 'variant'
  | 'quantity'
  | 'cart'
  | 'payment'
  | 'delivery'
  | 'confirmation'

export type CartItem = {
  id: string
  category: Category
  productId: string
  productName: string
  variantId: string
  variantLabel: string
  quantity: number
  unit: 'kg' | 'box'
  unitPrice: number
  /** Stock left for this variant, or null when the variant is untracked. */
  stockLimit: number | null
}

export type DeliveryDetails = {
  name: string
  phone: string
  /** Optional, and only asked of guests: accounts already have one. */
  email: string
  address: string
  instructions: string
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid'

/** Mirrors the `payment_method` enum, which only lists methods that can charge. */
export type PaymentMethod = 'cash_on_delivery'

export type OrderLine = {
  id: string
  orderId: string
  category: Category
  variantId: string | null
  productId: string | null
  productName: string | null
  quantity: number
  /** 'pack' only appears on orders placed before the inventory system. */
  unit: 'kg' | 'box' | 'pack'
  unitPrice: number
  lineTotal: number
}

export type Order = {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  customerName: string
  phone: string
  /** Where status emails go. Null when the customer asked for none. */
  contactEmail: string | null
  address: string
  instructions: string
  subtotal: number
  deliveryFee: number
  vatAmount: number
  total: number
  cancelledReason: string | null
  createdAt: string
  updatedAt: string
  items: OrderLine[]
}

/** One attempt at a status email. `sentAt` is null while it is still failing. */
export type OrderEmail = {
  id: string
  status: OrderStatus
  recipient: string
  sentAt: string | null
  error: string | null
  createdAt: string
}
