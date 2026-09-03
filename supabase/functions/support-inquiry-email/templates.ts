// Staff notification for a new support inquiry.

import {
  CTA_STYLE,
  escapeHtml,
  layout,
  MUTED_STYLE,
  SECTION_STYLE,
  SECTION_TITLE_STYLE,
} from '../_shared/email-layout.ts'

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
    ? `<a href="${escapeHtml(url)}" style="${CTA_STYLE}">Open in the staff inbox</a>`
    : 'Open Support in the staff inbox to reply.'

  const body = `
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">From</h2>
      <p style="margin:0">${escapeHtml(name)}</p>
      <p style="${MUTED_STYLE}">${escapeHtml(inquiry.email)}</p>
      ${phoneHtml}
    </div>
    <div style="${SECTION_STYLE}">
      <h2 style="${SECTION_TITLE_STYLE}">Message</h2>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>
    </div>`

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
