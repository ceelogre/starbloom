export const BRAND_NAME = 'Starbloom'
export const TAGLINE = 'Fresh into flavor'
export const CITY = 'Kigali'
export const SITE_TITLE = 'Starbloom — Fresh into flavor'
export const SITE_DESCRIPTION =
  'Order sausage, pork ribs, and ham for delivery in Kigali. Pay on delivery. VAT included.'

/** Omit a link rather than invent a handle. */
export const INSTAGRAM_URL = ''
export const WHATSAPP_URL = ''
export const PHONE = ''

export function pageTitle(page?: string) {
  return page ? `${BRAND_NAME} — ${page}` : SITE_TITLE
}
