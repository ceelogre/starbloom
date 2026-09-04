// Sends order update emails through Resend.
//
// Called by the orders_notify_status_email trigger in
// supabase/migrations/005_order_email_notifications.sql, never by the browser:
// the Resend key lives here, and reading another customer's order needs the
// service role. Deployed with verify_jwt = false, so the shared signature
// header below is the only thing standing between this and the open internet.

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildEmail,
  type NotifiableStatus,
  type OrderItemRow,
  type OrderRow,
} from './templates.ts'

const NOTIFIABLE_STATUSES: NotifiableStatus[] = [
  'confirmed',
  'out_for_delivery',
  'cancelled',
]

const ORDER_COLUMNS =
  'order_number, customer_id, customer_name, phone, contact_email, address, instructions, cancelled_reason, payment_method, subtotal, delivery_fee, vat_amount, total'

type Payload = {
  order_id?: unknown
  status?: unknown
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isNotifiable(value: unknown): value is NotifiableStatus {
  return typeof value === 'string' && NOTIFIABLE_STATUSES.includes(value as NotifiableStatus)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const signature = Deno.env.get('ORDER_EMAIL_SECRET')
  if (!signature || request.headers.get('x-starbloom-signature') !== signature) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let payload: Payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Body must be JSON' }, 400)
  }

  const orderId = payload.order_id
  const status = payload.status

  if (typeof orderId !== 'string' || !orderId) {
    return json({ error: 'order_id is required' }, 400)
  }
  if (!isNotifiable(status)) {
    return json({ error: 'status is not one we email about' }, 400)
  }

  // Checked before claiming the send below, so a missing key leaves no row
  // behind to block the retry once it is set.
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('ORDER_EMAIL_FROM')
  if (!resendKey || !from) {
    return json({ error: 'RESEND_API_KEY and ORDER_EMAIL_FROM must be set' }, 500)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .maybeSingle<OrderRow & { contact_email: string | null }>()

  if (orderError) {
    return json({ error: orderError.message }, 500)
  }
  if (!order) {
    return json({ error: 'Unknown order' }, 404)
  }
  if (!order.contact_email) {
    return json({ skipped: 'no recipient' }, 200)
  }

  // Claiming the (order, status) pair first is what makes this safe to call
  // twice: the unique constraint hands the row to one caller only, so a status
  // set again cannot mail the customer again.
  const { data: claims, error: claimError } = await supabase
    .from('order_emails')
    .upsert(
      { order_id: orderId, status, recipient: order.contact_email },
      { onConflict: 'order_id,status', ignoreDuplicates: true },
    )
    .select('id')

  if (claimError) {
    return json({ error: claimError.message }, 500)
  }
  if (!claims || claims.length === 0) {
    return json({ skipped: 'already handled' }, 200)
  }

  const claimId = claims[0].id as string

  async function fail(reason: string) {
    await supabase.from('order_emails').update({ error: reason }).eq('id', claimId)
    return json({ error: reason }, 500)
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_name, category, quantity, unit')
    .eq('order_id', orderId)

  if (itemsError) {
    return await fail(itemsError.message)
  }

  const email = buildEmail(
    status,
    order,
    (items ?? []) as OrderItemRow[],
    Deno.env.get('PUBLIC_SITE_URL') ?? undefined,
  )

  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [order.contact_email],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })
  } catch (error) {
    return await fail(error instanceof Error ? error.message : 'Could not reach Resend')
  }

  const result = (await response.json().catch(() => null)) as { id?: string } | null

  if (!response.ok) {
    return await fail(`Resend returned ${response.status}: ${JSON.stringify(result)}`)
  }

  await supabase
    .from('order_emails')
    .update({ provider_id: result?.id ?? null, sent_at: new Date().toISOString(), error: null })
    .eq('id', claimId)

  return json({ sent: true, provider_id: result?.id ?? null }, 200)
})
