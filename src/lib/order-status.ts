import type { OrderStatus } from '../types/order'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'new':
      return 'confirmed'
    case 'confirmed':
      return 'preparing'
    case 'preparing':
      return 'out_for_delivery'
    case 'out_for_delivery':
      return 'delivered'
    default:
      return null
  }
}

export function formatOrderTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Kigali',
  }).format(new Date(iso))
}
