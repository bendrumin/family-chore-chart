'use client'

import { PLAY_PRODUCT_IDS } from '@/lib/google/play-billing'

/**
 * Web-side bridge to Google Play Billing inside the Android shell. The shell
 * ships cordova-plugin-purchase, which Capacitor injects as window.CdvPurchase
 * into the remote page. Everything here is a no-op in a normal browser, so
 * the web app renders unchanged everywhere else.
 */

type CdvProduct = {
  id: string
  title?: string
  pricing?: { price?: string; priceMicros?: number; currency?: string; billingPeriod?: string }
  offers?: { id: string; pricingPhases?: { price?: string; billingPeriod?: string }[]; order: (opts?: unknown) => Promise<unknown> }[]
  getOffer?: () => { order: (opts?: unknown) => Promise<unknown> } | undefined
  owned?: boolean
}
type CdvTransaction = { products: { id: string }[]; purchaseId?: string; transactionId?: string; nativePurchase?: { purchaseToken?: string }; purchaseToken?: string; finish: () => void; state?: string }
type CdvStore = {
  register: (p: { id: string; type: string; platform: string }[]) => void
  initialize: (platforms: string[]) => Promise<unknown>
  update: () => Promise<unknown>
  restorePurchases: () => Promise<unknown>
  get: (id: string, platform?: string) => CdvProduct | undefined
  when: () => { approved: (cb: (t: CdvTransaction) => void) => unknown; productUpdated?: (cb: () => void) => unknown }
  applicationUsername?: string | (() => string)
  verbosity?: number
}
type CdvPurchaseNS = { store: CdvStore; ProductType: { PAID_SUBSCRIPTION: string }; Platform: { GOOGLE_PLAY: string } }

declare global {
  interface Window { CdvPurchase?: CdvPurchaseNS }
}

export interface PlayPlan { key: 'monthly' | 'yearly'; id: string; price: string; period: string }

export function playBillingAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.CdvPurchase?.store
}

let initialized: Promise<void> | null = null

/**
 * Registers our two subscriptions and initializes the Play platform once.
 * `userId` becomes Play's obfuscatedAccountId, which the server checks.
 */
export function initPlayBilling(userId: string): Promise<void> {
  if (!playBillingAvailable()) return Promise.resolve()
  if (initialized) return initialized
  const { store, ProductType, Platform } = window.CdvPurchase!
  store.applicationUsername = () => userId
  store.register([
    { id: PLAY_PRODUCT_IDS.monthly, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.GOOGLE_PLAY },
    { id: PLAY_PRODUCT_IDS.yearly, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.GOOGLE_PLAY },
  ])
  // Every approved transaction is verified server-side before it is finished;
  // Play refunds unfinished (unacknowledged) purchases after three days.
  store.when().approved(async (t) => {
    const purchaseToken = t.nativePurchase?.purchaseToken ?? t.purchaseToken
    const productId = t.products[0]?.id
    if (!purchaseToken) return
    try {
      const res = await fetch('/api/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseToken, productId }),
      })
      if (res.ok) {
        t.finish()
        window.dispatchEvent(new CustomEvent('chorestar:play-purchase-verified'))
      }
    } catch (e) {
      console.error('Play purchase verification failed; will retry on next launch', e)
    }
  })
  initialized = store.initialize([Platform.GOOGLE_PLAY]).then(() => undefined)
  return initialized
}

export function playPlans(): PlayPlan[] {
  if (!playBillingAvailable()) return []
  const { store, Platform } = window.CdvPurchase!
  const plans: PlayPlan[] = []
  for (const key of ['monthly', 'yearly'] as const) {
    const p = store.get(PLAY_PRODUCT_IDS[key], Platform.GOOGLE_PLAY)
    const phase = p?.offers?.[0]?.pricingPhases?.[0]
    const price = phase?.price ?? p?.pricing?.price
    if (p && price) plans.push({ key, id: p.id, price, period: key === 'monthly' ? 'month' : 'year' })
  }
  return plans
}

export async function buyPlayPlan(key: 'monthly' | 'yearly'): Promise<void> {
  if (!playBillingAvailable()) throw new Error('Play Billing is not available here')
  const { store, Platform } = window.CdvPurchase!
  const p = store.get(PLAY_PRODUCT_IDS[key], Platform.GOOGLE_PLAY)
  const offer = p?.offers?.[0] ?? p?.getOffer?.()
  if (!offer) throw new Error('This plan is not available in Google Play right now')
  await offer.order()
}

export async function restorePlayPurchases(): Promise<void> {
  if (!playBillingAvailable()) return
  await window.CdvPurchase!.store.restorePurchases()
}
