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
  { code: 'CAD', symbol: '$', flag: '🇨🇦', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: '$', flag: '🇦🇺', name: 'Australian Dollar', decimals: 2 },
  { code: 'NZD', symbol: '$', flag: '🇳🇿', name: 'New Zealand Dollar', decimals: 2 },
  { code: 'SAR', symbol: 'ر.س', flag: '🇸🇦', name: 'Saudi Riyal', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', name: 'UAE Dirham', decimals: 2 },
  { code: 'QAR', symbol: 'ر.ق', flag: '🇶🇦', name: 'Qatari Riyal', decimals: 2 },
  { code: 'EGP', symbol: 'E£', flag: '🇪🇬', name: 'Egyptian Pound', decimals: 2 },
  { code: 'ILS', symbol: '₪', flag: '🇮🇱', name: 'Israeli Shekel', decimals: 2 },
  { code: 'TRY', symbol: '₺', flag: '🇹🇷', name: 'Turkish Lira', decimals: 2 },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen', decimals: 0 },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan', decimals: 2 },
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: 'South Korean Won', decimals: 0 },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee', decimals: 2 },
  { code: 'SGD', symbol: '$', flag: '🇸🇬', name: 'Singapore Dollar', decimals: 2 },
  { code: 'HKD', symbol: '$', flag: '🇭🇰', name: 'Hong Kong Dollar', decimals: 2 },
  { code: 'TWD', symbol: 'NT$', flag: '🇹🇼', name: 'Taiwan Dollar', decimals: 2 },
  { code: 'THB', symbol: '฿', flag: '🇹🇭', name: 'Thai Baht', decimals: 2 },
  { code: 'PHP', symbol: '₱', flag: '🇵🇭', name: 'Philippine Peso', decimals: 2 },
  { code: 'MYR', symbol: 'RM', flag: '🇲🇾', name: 'Malaysian Ringgit', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', flag: '🇮🇩', name: 'Indonesian Rupiah', decimals: 2 },
  { code: 'CHF', symbol: 'Fr', flag: '🇨🇭', name: 'Swiss Franc', decimals: 2 },
  { code: 'SEK', symbol: 'kr', flag: '🇸🇪', name: 'Swedish Krona', decimals: 2 },
  { code: 'NOK', symbol: 'kr', flag: '🇳🇴', name: 'Norwegian Krone', decimals: 2 },
  { code: 'DKK', symbol: 'kr', flag: '🇩🇰', name: 'Danish Krone', decimals: 2 },
  { code: 'PLN', symbol: 'zł', flag: '🇵🇱', name: 'Polish Zloty', decimals: 2 },
  { code: 'CZK', symbol: 'Kč', flag: '🇨🇿', name: 'Czech Koruna', decimals: 2 },
  { code: 'MXN', symbol: '$', flag: '🇲🇽', name: 'Mexican Peso', decimals: 2 },
  { code: 'BRL', symbol: 'R$', flag: '🇧🇷', name: 'Brazilian Real', decimals: 2 },
  { code: 'COP', symbol: '$', flag: '🇨🇴', name: 'Colombian Peso', decimals: 2 },
  { code: 'ARS', symbol: '$', flag: '🇦🇷', name: 'Argentine Peso', decimals: 2 },
  { code: 'PEN', symbol: 'S/', flag: '🇵🇪', name: 'Peruvian Sol', decimals: 2 },
  { code: 'CLP', symbol: '$', flag: '🇨🇱', name: 'Chilean Peso', decimals: 0 },
  { code: 'ZAR', symbol: 'R', flag: '🇿🇦', name: 'South African Rand', decimals: 2 },
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

/**
 * Clean a partially-typed money string, preserving in-progress decimals.
 *
 * Money fields must NOT be `<input type="number">`. For an intermediate value
 * like "0." the browser reports `e.target.value` as an empty string, so the
 * decimal point is swallowed and typing 0 . 0 8 arrives as "008" — which is how
 * an attempt to enter 8 cents became $8.00. A text input plus this sanitizer
 * keeps every keystroke the user actually made.
 */
export function sanitizeAmountInput(raw: string): string {
  // Drop everything that isn't a digit or a dot.
  let s = raw.replace(/[^\d.]/g, '')
  // Keep only the first dot.
  const first = s.indexOf('.')
  if (first !== -1) {
    s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, '')
  }
  // At most two decimal places — storage is integer cents.
  const dot = s.indexOf('.')
  if (dot !== -1) s = s.slice(0, dot + 3)
  // Strip runs of leading zeros ("008" -> "08" -> "8") but keep a single "0"
  // and keep "0." intact so the user can carry on typing.
  s = s.replace(/^0+(?=\d)/, '')
  return s
}

/**
 * Parse a sanitized money string to integer cents, or null if it isn't a number
 * yet ("" or "." while mid-type).
 *
 * Deliberately string math, not `parseFloat(x) * 100`. That multiplication is
 * where money quietly breaks: 0.29 * 100 is 28.999999999999996, and truncating
 * gives 28 cents. Splitting on the dot and padding the fraction is exact.
 *
 * Always hundredths of a major unit, whatever the currency's display decimals —
 * that is what the `*_cents` columns hold.
 */
export function amountToCents(clean: string): number | null {
  if (clean === '' || clean === '.') return null
  const m = /^(\d*)(?:\.(\d*))?$/.exec(clean)
  if (!m) return null
  const whole = m[1] || '0'
  const frac = (m[2] ?? '').slice(0, 2).padEnd(2, '0')
  const cents = Number(whole) * 100 + Number(frac)
  return Number.isFinite(cents) ? cents : null
}
