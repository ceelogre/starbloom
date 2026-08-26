// Staff notification for a new support inquiry.
// Deno cannot import from `src/`, so layout helpers are repeated here.
// Keep the wrapper in step with order-status-email/templates.ts.

export type InquiryRow = {
  name: string
  email: string
  phone: string
  message: string
}

export type Email = {
  subject: string
  html: string
  text: string
}

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
  <body style="margin:0;background:#f6efe2">
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

function adminUrl(inquiryId: string, siteUrl: string | undefined) {
  return siteUrl ? `${siteUrl.replace(/\/$/, '')}/admin/support/${inquiryId}` : null
}

export function buildStaffEmail(
  inquiry: InquiryRow,
  inquiryId: string,
  siteUrl: string | undefined,
): Email {
  const name = inquiry.name.trim() || 'Someone'
  const phone = inquiry.phone.trim()
  const phoneHtml = phone ? `<p style="${MUTED_STYLE}">${escapeHtml(phone)}</p>` : ''
  const url = adminUrl(inquiryId, siteUrl)
  const footer = url
    ? `<a href="${escapeHtml(url)}">Open in the staff inbox</a>`
    : 'Open Support in the staff inbox to reply.'

  const body = `
    <h2 style="font-size:16px;margin:0 0 4px">From</h2>
    <p style="margin:0">${escapeHtml(name)}</p>
    <p style="${MUTED_STYLE}">${escapeHtml(inquiry.email)}</p>
    ${phoneHtml}
    <h2 style="font-size:16px;margin:24px 0 4px">Message</h2>
    <p style="margin:0;white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>`

  const text = [
    `${name} sent a support message.`,
    '',
    `Email: ${inquiry.email}`,
    phone ? `Phone: ${phone}` : null,
    '',
    inquiry.message,
    url ? `\nOpen in the staff inbox: ${url}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n')

  return {
    subject: `Support inquiry from ${name}`,
    html: layout({
      heading: 'New support inquiry',
      lead: `${escapeHtml(name)} sent a message from the contact form. Reply to this email to reach them.`,
      body,
      footer,
    }),
    text,
  }
}
