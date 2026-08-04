/**
 * Supported family currencies.
 *
 * Lived inside family-tab.tsx, where only the settings dropdown could reach it.
 * Anything else showing money hardcoded a `$`, so a family set to GBP still saw
 * dollar signs on their chore rewards.
 */

export interface Currency {
  code: string
  symbol: string
  flag: string
  name: string
  /** Smallest-unit exponent. JPY/KRW have no minor unit — ¥1.00 is meaningless. */
  decimals: number
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound', decimals: 2 },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen', decimals: 0 },
  { code: 'CAD', symbol: '$', flag: '🇨🇦', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: '$', flag: '🇦🇺', name: 'Australian Dollar', decimals: 2 },
  { code: 'CHF', symbol: 'Fr', flag: '🇨🇭', name: 'Swiss Franc', decimals: 2 },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan', decimals: 2 },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee', decimals: 2 },
  { code: 'MXN', symbol: '$', flag: '🇲🇽', name: 'Mexican Peso', decimals: 2 },
  { code: 'BRL', symbol: 'R$', flag: '🇧🇷', name: 'Brazilian Real', decimals: 2 },
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: 'South Korean Won', decimals: 0 },
]

export const DEFAULT_CURRENCY_CODE = 'USD'

export function findCurrency(code?: string | null): Currency {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0]
}

export function currencySymbol(code?: string | null): string {
  return findCurrency(code).symbol
}

/**
 * Format a minor-unit amount (cents) for display, without a symbol.
 *
 * Always takes cents — never a float. Amounts are stored as integer cents and
 * the moment they round-trip through a float you get the drift that turns 8
 * cents into 0.08 dollars into 8 dollars.
 */
export function formatAmount(cents: number, code?: string | null): string {
  const { decimals } = findCurrency(code)
  if (decimals === 0) return String(Math.round(cents / 100))
  return (cents / 100).toFixed(decimals)
}

/** Format with the currency symbol, e.g. "$1.00" or "¥120". */
export function formatMoney(cents: number, code?: string | null): string {
  return `${currencySymbol(code)}${formatAmount(cents, code)}`
}
