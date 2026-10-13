'use client'

import { useEffect, useState } from 'react'
import { formatPlanPrice, getPlanSavings, PLAN_PRICES } from '@/lib/utils/stripe'

// Display-only localization of the paywall prices, mirroring the Stripe
// currency_options and Apple territory prices set on 2026-09-03. Stripe
// Checkout picks the real charge currency from the customer's location, so
// this keys off the browser's REGION subtag (never its language: a Spanish
// speaker in the US pays USD) and falls back to USD for every region without
// an explicit price. The server render and first client render stay USD, so
// there is no hydration mismatch.
const REGIONAL_PRICES: Record<string, { monthly: string; annual: string; savings: string; annualPerMonth: string }> = {
  MX: { monthly: 'MX$69/mo', annual: 'MX$699/yr', savings: 'Save MX$129/year', annualPerMonth: 'MX$58/mo' },
  BR: { monthly: 'R$14.90/mo', annual: 'R$149.90/yr', savings: 'Save R$28.90/year', annualPerMonth: 'R$12.49/mo' },
  IN: { monthly: '₹99/mo', annual: '₹999/yr', savings: 'Save ₹189/year', annualPerMonth: '₹83/mo' },
  CL: { monthly: 'CLP $1.990/mo', annual: 'CLP $19.900/yr', savings: 'Save CLP $3.980/year', annualPerMonth: 'CLP $1.658/mo' },
  CO: { monthly: 'COP $9.900/mo', annual: 'COP $99.900/yr', savings: 'Save COP $18.900/year', annualPerMonth: 'COP $8.325/mo' },
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
    /** The yearly price as a monthly figure, to set beside the monthly plan. */
    annualPerMonth: local?.annualPerMonth ?? `$${(PLAN_PRICES.annual.amount / 12).toFixed(2)}/mo`,
  }
}
