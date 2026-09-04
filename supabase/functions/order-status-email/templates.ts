// Deno cannot import from `src/`, so the few formatting helpers the emails need
// are repeated here. Keep them in step with src/data/products.ts and
// src/lib/payment.ts.

import {
  CTA_STYLE,
  escapeHtml,
  layout,
  MUTED_COLOR,
  MUTED_STYLE,
  SECTION_STYLE,
  SECTION_TITLE_STYLE,
} from '../_shared/email-layout.ts'

export type NotifiableStatus = 'confirmed' | 'out_for_delivery' | 'cancelled'

export type OrderRow = {
  order_number: string
  customer_id: string | null
  customer_name: string
  phone: string
  address: string
  instructions: string
  cancelled_reason: string | null
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

function footerHtml(order: OrderRow, siteUrl: string | undefined, afterCancel = false) {
  const url = trackUrl(order, siteUrl)
  const followUp = afterCancel
    ? 'Reply to this email if you did not expect this.'
    : 'or reply to this email if anything needs changing.'

  if (!url) {
    return afterCancel ? followUp : REPLY_LINE
  }

  if (afterCancel) {
    return `<a href="${escapeHtml(url)}" style="${CTA_STYLE}">See this order</a><br /><span style="display:inline-block;margin-top:10px">${followUp}</span>`
  }

  return `<a href="${escapeHtml(url)}" style="${CTA_STYLE}">Track this order</a><br /><span style="display:inline-block;margin-top:10px">${followUp}</span>`
}

function footerText(order: OrderRow, siteUrl: string | undefined, afterCancel = false) {
  const url = trackUrl(order, siteUrl)
  if (afterCancel) {
    return url
      ? `See this order: ${url}\nReply to this email if you did not expect this.`
      : 'Reply to this email if you did not expect this.'
  }
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
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Your order</h2>
      <ul style="margin:0 0 16px;padding-left:20px">${itemsHtml(items)}</ul>
      ${totalsHtml(order)}
    </div>
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Delivering to</h2>
      <p style="margin:0">${escapeHtml(order.address)}</p>
      <p style="${MUTED_STYLE}">${escapeHtml(order.phone)}</p>
      ${order.instructions.trim() ? `<p style="${MUTED_STYLE}">Notes: ${escapeHtml(order.instructions)}</p>` : ''}
    </div>
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Payment</h2>
      <p style="margin:0">${escapeHtml(payment)}</p>
    </div>`

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
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Delivery details</h2>
      <p style="margin:0 0 4px"><strong>${escapeHtml(order.order_number)}</strong></p>
      <p style="margin:0">${escapeHtml(order.address)}</p>
      <p style="${MUTED_STYLE}">${escapeHtml(order.phone)}</p>
      <p style="margin:16px 0 0">${escapeHtml(owed)}</p>
      <p style="${MUTED_STYLE}">${escapeHtml(payment)}</p>
    </div>`

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

function cancelledEmail(
  order: OrderRow,
  items: OrderItemRow[],
  siteUrl: string | undefined,
): Email {
  const name = order.customer_name.split(' ')[0] || 'there'
  const reason = order.cancelled_reason?.trim() ?? ''

  const body = `
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Your order</h2>
      <ul style="margin:0 0 16px;padding-left:20px">${itemsHtml(items)}</ul>
      ${totalsHtml(order)}
    </div>
    ${
      reason
        ? `<div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Why</h2>
      <p style="margin:0">${escapeHtml(reason)}</p>
    </div>`
        : ''
    }`

  const text = [
    `Hi ${name}, order ${order.order_number} has been cancelled.`,
    '',
    ...items.map((item) => `- ${lineLabel(item)}`),
    '',
    `Total: ${formatPrice(order.total)}`,
    ...(reason ? ['', `Why: ${reason}`] : []),
    '',
    'Nothing is due.',
    footerText(order, siteUrl, true),
  ].join('\n')

  return {
    subject: `Order ${order.order_number} was cancelled`,
    html: layout({
      heading: `Order ${escapeHtml(order.order_number)} was cancelled`,
      lead: `Hi ${escapeHtml(name)}, this order will not be delivered. Nothing is due.`,
      body,
      footer: footerHtml(order, siteUrl, true),
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
  if (status === 'confirmed') {
    return confirmedEmail(order, items, siteUrl)
  }
  if (status === 'out_for_delivery') {
    return outForDeliveryEmail(order, siteUrl)
  }
  return cancelledEmail(order, items, siteUrl)
}
