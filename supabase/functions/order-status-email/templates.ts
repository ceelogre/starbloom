// Deno cannot import from `src/`, so the few formatting helpers the emails need
// are repeated here. Keep them in step with src/data/products.ts and
// src/lib/payment.ts.

export type NotifiableStatus = 'confirmed' | 'out_for_delivery'

export type OrderRow = {
  order_number: string
  customer_id: string | null
  customer_name: string
  phone: string
  address: string
  instructions: string
  payment_method: string
  subtotal: number
  delivery_fee: number
  vat_amount: number
  total: number
}

export type OrderItemRow = {
  product_name: string | null
  category: string
  quantity: number
  unit: string
}

export type Email = {
  subject: string
  html: string
  text: string
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: 'Pay on delivery',
}

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat('en-US').format(amount)} RWF`
}

function formatQuantity(quantity: number, unit: string) {
  if (unit === 'kg') {
    return `${quantity} kg`
  }

  const plural = unit === 'box' ? 'boxes' : `${unit}s`
  return `${quantity} ${quantity === 1 ? unit : plural}`
}

function lineLabel(item: OrderItemRow) {
  const name = item.product_name ?? (item.category === 'sausage' ? 'Sausage' : 'Item')
  return `${name} — ${formatQuantity(Number(item.quantity), item.unit)}`
}

/** Names, addresses and notes are customer input and land inside markup. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const WRAPPER_STYLE = [
  'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  'font-size: 15px',
  'line-height: 1.5',
  'color: #1c2418',
  'max-width: 34rem',
  'margin: 0 auto',
  'padding: 24px',
].join(';')

const MUTED_COLOR = '#5a6352'
const MUTED_STYLE = `color: ${MUTED_COLOR}; margin: 4px 0`
const BRAND_STYLE = 'font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#1f6b38;margin:4px 0;font-weight:700'

function layout(parts: { heading: string; lead: string; body: string; footer: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;">
    <div style="${WRAPPER_STYLE}">
      <p style="${BRAND_STYLE}">Starbloom</p>
      <h1 style="font-size:22px;margin:8px 0 12px">${parts.heading}</h1>
      <p style="margin:0 0 20px">${parts.lead}</p>
      ${parts.body}
      <p style="margin-top:24px;${MUTED_STYLE}">${parts.footer}</p>
    </div>
  </body>
</html>`
}

function itemsHtml(items: OrderItemRow[]) {
  return items.map((item) => `<li style="margin:2px 0">${escapeHtml(lineLabel(item))}</li>`).join('')
}

/** A table, not flexbox: Outlook ignores flex and would stack the columns. */
function totalsHtml(order: OrderRow) {
  const rows: [string, string][] = [
    ['Subtotal', formatPrice(order.subtotal)],
    ['Delivery', formatPrice(order.delivery_fee)],
    ['VAT included', formatPrice(order.vat_amount)],
  ]

  const row = (label: string, value: string, style: string) =>
    `<tr><td style="padding:2px 0;${style}">${label}</td><td style="padding:2px 0;text-align:right;${style}">${value}</td></tr>`

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
      ${rows.map(([label, value]) => row(label, value, `color:${MUTED_COLOR}`)).join('')}
      ${row('Total', formatPrice(order.total), 'font-weight:600')}
    </table>`
}

const REPLY_LINE = 'Reply to this email or call us if anything needs changing.'

/** Only account holders can open /orders, so guests get no link to it. */
function trackUrl(order: OrderRow, siteUrl: string | undefined) {
  return order.customer_id && siteUrl ? `${siteUrl.replace(/\/$/, '')}/orders` : null
}

function footerHtml(order: OrderRow, siteUrl: string | undefined) {
  const url = trackUrl(order, siteUrl)
  if (!url) {
    return REPLY_LINE
  }

  return `<a href="${escapeHtml(url)}">Track this order</a> in your account, or reply to this email if anything needs changing.`
}

function footerText(order: OrderRow, siteUrl: string | undefined) {
  const url = trackUrl(order, siteUrl)
  return url ? `Track this order: ${url}` : REPLY_LINE
}

function confirmedEmail(
  order: OrderRow,
  items: OrderItemRow[],
  siteUrl: string | undefined,
): Email {
  const payment = PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method
  const name = order.customer_name.split(' ')[0] || 'there'

  const body = `
    <h2 style="font-size:16px;margin:0 0 4px">Your order</h2>
    <ul style="margin:0 0 16px;padding-left:20px">${itemsHtml(items)}</ul>
    ${totalsHtml(order)}
    <h2 style="font-size:16px;margin:24px 0 4px">Delivering to</h2>
    <p style="margin:0">${escapeHtml(order.address)}</p>
    <p style="${MUTED_STYLE}">${escapeHtml(order.phone)}</p>
    ${order.instructions.trim() ? `<p style="${MUTED_STYLE}">Notes: ${escapeHtml(order.instructions)}</p>` : ''}
    <h2 style="font-size:16px;margin:24px 0 4px">Payment</h2>
    <p style="margin:0">${escapeHtml(payment)}</p>`

  const text = [
    `Hi ${name}, order ${order.order_number} is confirmed.`,
    '',
    ...items.map((item) => `- ${lineLabel(item)}`),
    '',
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Delivery: ${formatPrice(order.delivery_fee)}`,
    `VAT included: ${formatPrice(order.vat_amount)}`,
    `Total: ${formatPrice(order.total)}`,
    '',
    `Delivering to: ${order.address}`,
    `Phone: ${order.phone}`,
    `Payment: ${payment}`,
    '',
    'We will email you again when it leaves for delivery.',
    footerText(order, siteUrl),
  ].join('\n')

  return {
    subject: `Order ${order.order_number} is confirmed`,
    html: layout({
      heading: `Order ${escapeHtml(order.order_number)} is confirmed`,
      lead: `Hi ${escapeHtml(name)}, <br /> we have your order and we are getting it ready. We will email you again when it leaves for delivery.`,
      body,
      footer: footerHtml(order, siteUrl),
    }),
    text,
  }
}

function outForDeliveryEmail(
  order: OrderRow,
  siteUrl: string | undefined,
): Email {
  const payment = PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method
  const name = order.customer_name.split(' ')[0] || 'there'
  const owed =
    order.payment_method === 'cash_on_delivery'
      ? `Have ${formatPrice(order.total)} ready for the driver.`
      : `Order total: ${formatPrice(order.total)}.`

  const body = `
    <p style="margin:0 0 4px"><strong>${escapeHtml(order.order_number)}</strong></p>
    <p style="margin:0">${escapeHtml(order.address)}</p>
    <p style="${MUTED_STYLE}">${escapeHtml(order.phone)}</p>
    <p style="margin:16px 0 0">${escapeHtml(owed)}</p>
    <p style="${MUTED_STYLE}">${escapeHtml(payment)}</p>`

  const text = [
    `Hi ${name}, order ${order.order_number} is on the way.`,
    '',
    `Delivering to: ${order.address}`,
    `Phone: ${order.phone}`,
    owed,
    `Payment: ${payment}`,
    '',
    footerText(order, siteUrl),
  ].join('\n')

  return {
    subject: 'Your Starbloom order is on the way',
    html: layout({
      heading: 'Your order is on the way',
      lead: `Hi ${escapeHtml(name)}, the driver has left with your order.`,
      body,
      footer: footerHtml(order, siteUrl),
    }),
    text,
  }
}

export function buildEmail(
  status: NotifiableStatus,
  order: OrderRow,
  items: OrderItemRow[],
  siteUrl: string | undefined,
): Email {
  return status === 'confirmed'
    ? confirmedEmail(order, items, siteUrl)
    : outForDeliveryEmail(order, siteUrl)
}
