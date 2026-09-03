'use client'

import { useEffect, useState } from 'react'
import { formatPlanPrice, getPlanSavings } from '@/lib/utils/stripe'

// Display-only localization of the paywall prices, mirroring the Stripe
// currency_options and Apple territory prices set on 2026-09-03. Stripe
// Checkout picks the real charge currency from the customer's location, so
// this keys off the browser's REGION subtag (never its language: a Spanish
// speaker in the US pays USD) and falls back to USD for every region without
// an explicit price. The server render and first client render stay USD, so
// there is no hydration mismatch.
const REGIONAL_PRICES: Record<string, { monthly: string; annual: string; savings: string }> = {
  MX: { monthly: 'MX$69/mo', annual: 'MX$699/yr', savings: 'Save MX$129/year' },
  BR: { monthly: 'R$14.90/mo', annual: 'R$149.90/yr', savings: 'Save R$28.90/year' },
}

export function useDisplayPrices() {
  const [region, setRegion] = useState<string | null>(null)

  useEffect(() => {
    try {
      const r = new Intl.Locale(navigator.language).region
      if (r && REGIONAL_PRICES[r]) setRegion(r)
    } catch {
      // Unparseable language tag: keep USD.
    }
  }, [])

  const local = region ? REGIONAL_PRICES[region] : null
  return {
    monthly: local?.monthly ?? formatPlanPrice('monthly'),
    annual: local?.annual ?? formatPlanPrice('annual'),
    annualSavings: local?.savings ?? getPlanSavings('annual'),
  }
}
