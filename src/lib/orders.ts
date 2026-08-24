import { lineTotal } from './cart'
import { isSupabaseConfigured, supabase } from './supabase'
import type {
  CartItem,
  DeliveryDetails,
  Order,
  OrderLine,
  OrderStatus,
  PaymentStatus,
} from '../types/order'

type PlaceOrderResult = {
  id: string
  orderNumber: string
}

type OrderRow = {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  customer_name: string
  phone: string
  address: string
  instructions: string
  subtotal: number
  delivery_fee: number
  vat_amount: number
  total: number
  cancelled_reason: string | null
  created_at: string
  updated_at: string
}

type OrderItemRow = {
  id: string
  order_id: string
  category: 'meat' | 'sausage'
  product_id: string | null
  product_name: string | null
  quantity: number
  unit: 'kg' | 'pack'
  unit_price: number
  line_total: number
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.',
    )
  }
}

function cartItemsPayload(items: CartItem[]) {
  return items.map((item) => ({
    category: item.category,
    product_id: item.category === 'meat' ? item.productId : null,
    product_name: item.category === 'meat' ? item.productName : 'Sausage',
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    line_total: lineTotal(item),
  }))
}

function mapLine(row: OrderItemRow): OrderLine {
  return {
    id: row.id,
    orderId: row.order_id,
    category: row.category,
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
  }
}

export async function fetchMyOrders(): Promise<Order[]> {
  requireSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Sign in to see your orders.')
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as OrderRow[]).map((row) => mapOrder(row))
}

export async function fetchMyOrder(id: string): Promise<Order> {
  requireSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Sign in to see your orders.')
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single()

  if (orderError) {
    throw new Error(orderError.message)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return mapOrder(order as OrderRow, ((items ?? []) as OrderItemRow[]).map(mapLine))
}

function mapOrder(row: OrderRow, items: OrderLine[] = []): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    instructions: row.instructions,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    vatAmount: row.vat_amount,
    total: row.total,
    cancelledReason: row.cancelled_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  }
}

export async function placeGuestOrder(
  cart: CartItem[],
  delivery: DeliveryDetails,
  money: { subtotal: number; deliveryFee: number; vatAmount: number; total: number },
): Promise<PlaceOrderResult> {
  requireSupabase()

  const { data, error } = await supabase.rpc('place_guest_order', {
    p_customer_name: delivery.name.trim(),
    p_phone: delivery.phone.trim(),
    p_address: delivery.address.trim(),
    p_instructions: delivery.instructions.trim(),
    p_subtotal: money.subtotal,
    p_delivery_fee: money.deliveryFee,
    p_vat_amount: money.vatAmount,
    p_total: money.total,
    p_items: cartItemsPayload(cart),
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id || !row?.order_number) {
    throw new Error('Order was not created.')
  }

  return { id: row.id as string, orderNumber: row.order_number as string }
}

export type OrderFilters = {
  status?: OrderStatus | 'all'
  phone?: string
  fromDate?: string
  toDate?: string
}

export async function fetchOrders(filters: OrderFilters = {}): Promise<Order[]> {
  requireSupabase()

  let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const phone = filters.phone?.trim()
  if (phone) {
    query = query.ilike('phone', `%${phone}%`)
  }

  if (filters.fromDate) {
    query = query.gte('created_at', `${filters.fromDate}T00:00:00`)
  }

  if (filters.toDate) {
    query = query.lte('created_at', `${filters.toDate}T23:59:59.999`)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as OrderRow[]).map((row) => mapOrder(row))
}

export async function fetchOrder(id: string): Promise<Order> {
  requireSupabase()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError) {
    throw new Error(orderError.message)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return mapOrder(order as OrderRow, ((items ?? []) as OrderItemRow[]).map(mapLine))
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  requireSupabase()

  const patch: { status: OrderStatus; cancelled_reason?: string | null } = { status }
  if (status !== 'cancelled') {
    patch.cancelled_reason = null
  }

  const { error } = await supabase.from('orders').update(patch).eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}

export async function markOrderPaid(id: string) {
  requireSupabase()

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid' satisfies PaymentStatus })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function cancelOrder(id: string, reason: string) {
  requireSupabase()

  const trimmed = reason.trim()
  if (!trimmed) {
    throw new Error('A cancel reason is required.')
  }

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled' satisfies OrderStatus,
      cancelled_reason: trimmed,
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export function formatLineLabel(line: OrderLine) {
  const name =
    line.productName ?? (line.category === 'sausage' ? 'Sausage' : 'Item')
  const unitLabel =
    line.unit === 'kg' ? 'kg' : line.quantity === 1 ? 'pack' : 'packs'
  return `${name} — ${line.quantity} ${unitLabel}`
}
