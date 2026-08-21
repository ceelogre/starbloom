export const MEAT_PRICE_PER_KG = 8000
export const SAUSAGE_PRICE_PER_PACK = 10_000
export const DELIVERY_PRICE = 2000

/** VAT rate already included in listed prices (e.g. 0.18 = 18%). */
export const VAT_RATE = 0.18

export const MEAT_PRODUCTS = [
  { id: 'pork-ribs', name: 'Pork ribs' },
  { id: 'ham', name: 'Ham' },
] as const

export const SAUSAGE_LABEL = 'Sausage'

export const SAUSAGE_QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const MEAT_QUANTITY_OPTIONS = [0.5, ...SAUSAGE_QUANTITY_OPTIONS] as const

export function formatPrice(amount: number) {
  return `${new Intl.NumberFormat('en-US').format(amount)} RWF`
}

export function unitPriceFor(category: 'meat' | 'sausage') {
  return category === 'meat' ? MEAT_PRICE_PER_KG : SAUSAGE_PRICE_PER_PACK
}

/** VAT portion of a VAT-inclusive amount. */
export function vatIncludedIn(amount: number) {
  return Math.round(amount * (VAT_RATE / (1 + VAT_RATE)))
}
