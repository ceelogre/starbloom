// Sends staff a copy of a new support inquiry through Resend.
//
// Called by the support_inquiries_notify_email trigger in
// supabase/migrations/006_support_inquiries.sql, never by the browser:
// the Resend key lives here. Deployed with verify_jwt = false, so the shared
// signature header below is the only thing standing between this and the open
// internet.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildStaffEmail, type InquiryRow } from './templates.ts'

type Payload = {
  inquiry_id?: unknown
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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

  const inquiryId = payload.inquiry_id
  if (typeof inquiryId !== 'string' || !inquiryId) {
    return json({ error: 'inquiry_id is required' }, 400)
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('ORDER_EMAIL_FROM')
  const inbox = Deno.env.get('SUPPORT_INBOX_EMAIL')
  if (!resendKey || !from || !inbox) {
    return json({ error: 'RESEND_API_KEY, ORDER_EMAIL_FROM and SUPPORT_INBOX_EMAIL must be set' }, 500)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  const { data: inquiry, error: inquiryError } = await supabase
    .from('support_inquiries')
    .select('name, email, phone, message, email_sent_at')
    .eq('id', inquiryId)
    .maybeSingle<InquiryRow & { email_sent_at: string | null }>()

  if (inquiryError) {
    return json({ error: inquiryError.message }, 500)
  }
  if (!inquiry) {
    return json({ error: 'Unknown inquiry' }, 404)
  }
  if (inquiry.email_sent_at) {
    return json({ skipped: 'already sent' }, 200)
  }

  const email = buildStaffEmail(inquiry, inquiryId, Deno.env.get('PUBLIC_SITE_URL') ?? undefined)

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
        to: [inbox],
        reply_to: inquiry.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Could not reach Resend'
    await supabase.from('support_inquiries').update({ email_error: reason }).eq('id', inquiryId)
    return json({ error: reason }, 500)
  }

  const result = (await response.json().catch(() => null)) as { id?: string } | null

  if (!response.ok) {
    const reason = `Resend returned ${response.status}: ${JSON.stringify(result)}`
    await supabase.from('support_inquiries').update({ email_error: reason }).eq('id', inquiryId)
    return json({ error: reason }, 500)
  }

  await supabase
    .from('support_inquiries')
    .update({
      email_provider_id: result?.id ?? null,
      email_sent_at: new Date().toISOString(),
      email_error: null,
    })
    .eq('id', inquiryId)

  return json({ sent: true, provider_id: result?.id ?? null }, 200)
})
