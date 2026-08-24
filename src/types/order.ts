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

/** Mirrors the `payment_method` enum. Only some of these can be picked today. */
export type PaymentMethod = 'cash_on_delivery' | 'mobile_money' | 'card'

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
