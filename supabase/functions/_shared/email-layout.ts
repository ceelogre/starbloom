// Shared HTML email shell and inline styles for Starbloom Edge Function mailers.

export function escapeHtml(value: string) {
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
  'line-height: 1.6',
  'color: #1f2937',
  'max-width: 36rem',
  'margin: 0 auto',
  'padding: 28px 16px',
].join(';')

export const PAGE_STYLE = 'margin:0;background:#f4f7fb'
export const CARD_STYLE = [
  'background:#ffffff',
  'border:1px solid #e5e7eb',
  'border-radius:16px',
  'padding:24px',
  'box-shadow:0 8px 24px rgba(15,23,42,0.05)',
].join(';')

export const MUTED_COLOR = '#6b7280'
export const MUTED_STYLE = `color:${MUTED_COLOR};margin:4px 0`
export const BRAND_STYLE =
  'display:inline-block;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#4f46e5;background:#eef2ff;padding:6px 10px;border-radius:999px;margin:0 0 12px;font-weight:700'
export const HEADER_STYLE = 'font-size:28px;line-height:1.2;margin:0 0 10px;color:#111827'
export const LEAD_STYLE = 'margin:0 0 20px;color:#374151'
export const SECTION_STYLE =
  'margin:20px 0 0;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa'
export const SECTION_TITLE_STYLE =
  'font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;margin:0 0 8px;font-weight:700'
export const FOOTER_STYLE = `margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;color:${MUTED_COLOR}`
export const CTA_STYLE =
  'display:inline-block;background:#4f46e5;color:#ffffff !important;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600'

export function layout(parts: { heading: string; lead: string; body: string; footer: string }) {
  return `<!doctype html>
<html>
  <body style="${PAGE_STYLE}">
    <div style="${WRAPPER_STYLE}">
      <div style="${CARD_STYLE}">
        <p style="${BRAND_STYLE}">Starbloom</p>
        <h1 style="${HEADER_STYLE}">${parts.heading}</h1>
        <p style="${LEAD_STYLE}">${parts.lead}</p>
        ${parts.body}
        <p style="${FOOTER_STYLE}">${parts.footer}</p>
      </div>
    </div>
  </body>
</html>`
}
