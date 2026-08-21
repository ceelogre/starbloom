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
