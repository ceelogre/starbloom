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
    }
  | {
      id: string
      category: 'sausage'
      quantity: number
      unit: 'pack'
    }

export type DeliveryDetails = {
  name: string
  address: string
  instructions: string
}
