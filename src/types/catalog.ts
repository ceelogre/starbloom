import type { Category } from './order'

export type ProductTag = 'smoked' | 'fresh'

export type VariantUnit = 'kg' | 'box'

export type ProductVariant = {
  id: string
  productId: string
  unit: VariantUnit
  label: string
  pieces: number | null
  price: number
  stockQuantity: number
  lowStockAt: number
  trackStock: boolean
  isActive: boolean
  sortOrder: number
}

export type Product = {
  id: string
  slug: string
  category: Category
  name: string
  tag: ProductTag | null
  description: string
  sortOrder: number
  isActive: boolean
  variants: ProductVariant[]
}

export type StockReason =
  | 'restock'
  | 'adjustment'
  | 'sale'
  | 'waste'
  | 'cancel_restore'

export type StockMovement = {
  id: string
  variantId: string
  delta: number
  reason: StockReason
  note: string
  orderId: string | null
  createdAt: string
}

export type ProductDraft = {
  slug: string
  category: Category
  name: string
  tag: ProductTag | null
  description: string
  sortOrder: number
  isActive: boolean
}

export type VariantDraft = {
  unit: VariantUnit
  label: string
  pieces: number | null
  price: number
  lowStockAt: number
  trackStock: boolean
  isActive: boolean
  sortOrder: number
}

export function availableStock(variant: ProductVariant) {
  return variant.trackStock ? variant.stockQuantity : Number.POSITIVE_INFINITY
}

export function isVariantSoldOut(variant: ProductVariant) {
  return variant.trackStock && variant.stockQuantity <= 0
}

export function isVariantLow(variant: ProductVariant) {
  return (
    variant.trackStock &&
    variant.stockQuantity > 0 &&
    variant.stockQuantity <= variant.lowStockAt
  )
}

/** Variants a customer can actually add to a cart right now. */
export function sellableVariants(product: Product) {
  return product.variants.filter(
    (variant) => variant.isActive && !isVariantSoldOut(variant),
  )
}

export function isProductSoldOut(product: Product) {
  return sellableVariants(product).length === 0
}

/** Lowest price a customer can actually pay today, ignoring sold-out variants. */
export function cheapestPrice(product: Product) {
  const prices = sellableVariants(product).map((variant) => variant.price)

  return prices.length > 0 ? Math.min(...prices) : null
}
