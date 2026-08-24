export type Category = 'meat' | 'sausage'

export type OrderStep =
  | 'home'
  | 'category'
  | 'product'
  | 'quantity'
  | 'cart'
  | 'delivery'
  | 'confirmation'

export type CartItem =
  | {
      id: string
      category: 'meat'
      productId: string
      productName: string
      quantity: number
      unit: 'kg'
      unitPrice: number
    }
  | {
      id: string
      category: 'sausage'
      quantity: number
      unit: 'pack'
      unitPrice: number
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

export type OrderLine = {
  id: string
  orderId: string
  category: Category
  productId: string | null
  productName: string | null
  quantity: number
  unit: 'kg' | 'pack'
  unitPrice: number
  lineTotal: number
}

export type Order = {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
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
