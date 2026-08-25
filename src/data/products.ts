import type { Product, ProductTag, VariantUnit } from '../types/catalog'
import type { Category } from '../types/order'

export const DELIVERY_PRICE = 2000

/** VAT rate already included in listed prices (e.g. 0.18 = 18%). */
export const VAT_RATE = 0.18

export const CATEGORY_LABELS: Record<Category, string> = {
  meat: 'Pork meat',
  sausage: 'Sausage',
}

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  meat: 'Cuts prepared and weighed to order.',
  sausage: 'Smoked and fresh, boxed or by the kilo.',
}

export const TAG_LABELS: Record<ProductTag, string> = {
  smoked: 'Smoked',
  fresh: 'Fresh',
}

export const UNIT_LABELS: Record<VariantUnit, string> = {
  kg: 'kg',
  box: 'box',
}

export const KG_QUANTITY_OPTIONS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const BOX_QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export function quantityOptionsFor(unit: VariantUnit) {
  return unit === 'kg' ? KG_QUANTITY_OPTIONS : BOX_QUANTITY_OPTIONS
}

export function quantityStepFor(unit: VariantUnit) {
  return unit === 'kg' ? 0.5 : 1
}

export function formatQuantity(quantity: number, unit: VariantUnit) {
  if (unit === 'kg') {
    return `${quantity} kg`
  }

  return `${quantity} ${quantity === 1 ? 'box' : 'boxes'}`
}

export function formatPrice(amount: number) {
  return `${new Intl.NumberFormat('en-US').format(amount)} RWF`
}

/** VAT portion of a VAT-inclusive amount. */
export function vatIncludedIn(amount: number) {
  return Math.round(amount * (VAT_RATE / (1 + VAT_RATE)))
}

type SeedVariant = [unit: VariantUnit, label: string, pieces: number | null, price: number]

type SeedProduct = {
  slug: string
  category: Category
  name: string
  tag: ProductTag | null
  variants: SeedVariant[]
}

const BOX_LABEL = 'Box · 5 pcs'
const KG_LABEL = 'Per kg'

const SEED: SeedProduct[] = [
  {
    slug: 'spiced-smoked-beef-sausage',
    category: 'sausage',
    name: 'Spiced Smoked Beef Sausage',
    tag: 'smoked',
    variants: [
      ['box', BOX_LABEL, 5, 10_000],
      ['kg', KG_LABEL, null, 14_000],
    ],
  },
  {
    slug: 'smoked-pork-sausage',
    category: 'sausage',
    name: 'Smoked Pork Sausage',
    tag: 'smoked',
    variants: [
      ['box', BOX_LABEL, 5, 10_000],
      ['kg', KG_LABEL, null, 13_000],
    ],
  },
  {
    slug: 'cheese-sausage',
    category: 'sausage',
    name: 'Cheese Sausage',
    tag: 'smoked',
    variants: [
      ['box', BOX_LABEL, 5, 12_000],
      ['kg', KG_LABEL, null, 18_000],
    ],
  },
  {
    slug: 'non-spicy-smoked-sausage',
    category: 'sausage',
    name: 'Non-Spicy Smoked Sausage',
    tag: 'smoked',
    variants: [
      ['box', BOX_LABEL, 5, 10_000],
      ['kg', KG_LABEL, null, 13_000],
    ],
  },
  {
    slug: 'mixed-package',
    category: 'sausage',
    name: 'Mixed Package',
    tag: 'smoked',
    variants: [
      ['box', BOX_LABEL, 5, 10_000],
      ['kg', KG_LABEL, null, 15_000],
    ],
  },
  {
    slug: 'fresh-beef-sausage',
    category: 'sausage',
    name: 'Fresh Beef Sausage',
    tag: 'fresh',
    variants: [['kg', KG_LABEL, null, 15_000]],
  },
  {
    slug: 'fresh-pork-sausage',
    category: 'sausage',
    name: 'Fresh Pork Sausage',
    tag: 'fresh',
    variants: [['kg', KG_LABEL, null, 13_000]],
  },
  {
    slug: 'pork-ribs',
    category: 'meat',
    name: 'Pork ribs',
    tag: null,
    variants: [['kg', KG_LABEL, null, 8_000]],
  },
  {
    slug: 'ham',
    category: 'meat',
    name: 'Ham',
    tag: null,
    variants: [['kg', KG_LABEL, null, 8_000]],
  },
]

/**
 * Mirror of the seed rows in `supabase/migrations/003_inventory.sql`, used to
 * render the shop before Supabase env vars are set. Checkout still requires a
 * real connection, so these rows are never sold from.
 */
export const FALLBACK_CATALOG: Product[] = SEED.map((product, productIndex) => ({
  id: product.slug,
  slug: product.slug,
  category: product.category,
  name: product.name,
  tag: product.tag,
  description: '',
  sortOrder: productIndex,
  isActive: true,
  variants: product.variants.map(([unit, label, pieces, price], variantIndex) => ({
    id: `${product.slug}-${unit}`,
    productId: product.slug,
    unit,
    label,
    pieces,
    price,
    stockQuantity: 0,
    lowStockAt: 0,
    trackStock: false,
    isActive: true,
    sortOrder: variantIndex,
  })),
}))
