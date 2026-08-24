import { FALLBACK_CATALOG } from '../data/products'
import { isSupabaseConfigured, requireSupabase, supabase } from './supabase'
import type {
  Product,
  ProductDraft,
  ProductTag,
  ProductVariant,
  StockMovement,
  StockReason,
  VariantDraft,
  VariantUnit,
} from '../types/catalog'
import type { Category } from '../types/order'

type ProductRow = {
  id: string
  slug: string
  category: Category
  name: string
  tag: ProductTag | null
  description: string
  sort_order: number
  is_active: boolean
  product_variants: VariantRow[] | null
}

type VariantRow = {
  id: string
  product_id: string
  unit: VariantUnit
  label: string
  pieces: number | null
  price: number
  stock_quantity: number
  low_stock_at: number
  track_stock: boolean
  is_active: boolean
  sort_order: number
}

type MovementRow = {
  id: string
  variant_id: string
  delta: number
  reason: StockReason
  note: string
  order_id: string | null
  created_at: string
}

const PRODUCT_SELECT = '*, product_variants(*)'

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    unit: row.unit,
    label: row.label,
    pieces: row.pieces,
    price: row.price,
    stockQuantity: Number(row.stock_quantity),
    lowStockAt: Number(row.low_stock_at),
    trackStock: row.track_stock,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    name: row.name,
    tag: row.tag,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    variants: (row.product_variants ?? [])
      .map(mapVariant)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function productPayload(draft: ProductDraft) {
  return {
    slug: draft.slug.trim(),
    category: draft.category,
    name: draft.name.trim(),
    tag: draft.tag,
    description: draft.description.trim(),
    sort_order: draft.sortOrder,
    is_active: draft.isActive,
  }
}

function variantPayload(draft: VariantDraft) {
  return {
    unit: draft.unit,
    label: draft.label.trim(),
    pieces: draft.pieces,
    price: draft.price,
    low_stock_at: draft.lowStockAt,
    track_stock: draft.trackStock,
    is_active: draft.isActive,
    sort_order: draft.sortOrder,
  }
}

/**
 * Catalog for the shop. Falls back to the seed data so the storefront still
 * renders when Supabase env vars are missing.
 */
export async function fetchCatalog(): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_CATALOG
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .order('category')
    .order('sort_order')

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as ProductRow[])
    .map(mapProduct)
    .map((product) => ({
      ...product,
      variants: product.variants.filter((variant) => variant.isActive),
    }))
    .filter((product) => product.variants.length > 0)
}

/** Full catalog for staff, including paused products and variants. */
export async function fetchInventory(): Promise<Product[]> {
  requireSupabase()

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .order('category')
    .order('sort_order')

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as ProductRow[]).map(mapProduct)
}

export async function fetchProduct(id: string): Promise<Product> {
  requireSupabase()

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapProduct(data as ProductRow)
}

export async function createProduct(
  draft: ProductDraft,
  variants: VariantDraft[],
): Promise<string> {
  requireSupabase()

  const { data, error } = await supabase
    .from('products')
    .insert(productPayload(draft))
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const productId = (data as { id: string }).id

  if (variants.length > 0) {
    await createVariants(productId, variants)
  }

  return productId
}

export async function updateProduct(id: string, draft: ProductDraft) {
  requireSupabase()

  const { error } = await supabase.from('products').update(productPayload(draft)).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function setProductActive(id: string, isActive: boolean) {
  requireSupabase()

  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function createVariants(productId: string, drafts: VariantDraft[]) {
  requireSupabase()

  const { error } = await supabase
    .from('product_variants')
    .insert(drafts.map((draft) => ({ ...variantPayload(draft), product_id: productId })))

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateVariant(id: string, draft: VariantDraft) {
  requireSupabase()

  const { error } = await supabase
    .from('product_variants')
    .update(variantPayload(draft))
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function setVariantActive(id: string, isActive: boolean) {
  requireSupabase()

  const { error } = await supabase
    .from('product_variants')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

/** Stock only ever moves through this RPC, which also writes the audit row. */
export async function adjustStock(
  variantId: string,
  delta: number,
  reason: Exclude<StockReason, 'sale' | 'cancel_restore'>,
  note = '',
): Promise<number> {
  requireSupabase()

  const { data, error } = await supabase.rpc('adjust_stock', {
    p_variant_id: variantId,
    p_delta: delta,
    p_reason: reason,
    p_note: note,
  })

  if (error) {
    throw new Error(error.message)
  }

  return Number(data)
}

export async function setStock(variant: ProductVariant, target: number, note = '') {
  const delta = target - variant.stockQuantity

  if (delta === 0) {
    return variant.stockQuantity
  }

  return adjustStock(variant.id, delta, 'adjustment', note || 'Counted stock')
}

export async function fetchStockMovements(variantId: string, limit = 20): Promise<StockMovement[]> {
  requireSupabase()

  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('variant_id', variantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as MovementRow[]).map((row) => ({
    id: row.id,
    variantId: row.variant_id,
    delta: Number(row.delta),
    reason: row.reason,
    note: row.note,
    orderId: row.order_id,
    createdAt: row.created_at,
  }))
}

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  restock: 'Restock',
  adjustment: 'Adjustment',
  sale: 'Sold',
  waste: 'Waste',
  cancel_restore: 'Order cancelled',
}
