import { createPrivateKey, createSign } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { Database } from '@/lib/supabase/database.types'

/**
 * The admin Revenue tab: what families have actually paid, across Apple, Stripe
 * and Google Play.
 *
 * Apple is read live from the App Store Server API (transaction history and
 * subscription status per profiles.apple_original_transaction_id), so prices,
 * currencies and renewal state are Apple's own, not inferred from product ids.
 * It needs an App Store Connect API key: APP_STORE_API_KEY_ID,
 * APP_STORE_API_ISSUER_ID and APP_STORE_API_PRIVATE_KEY (the .p8 contents).
 *
 * Amounts are customer-paid (gross, VAT included where the storefront adds it).
 * USD figures use approximate fixed rates and are labeled as such in the UI.
 * The totaling rules are pure (planOf, toUsd, summarize) so revenue.test.ts
 * covers them without network access.
 */

export type Channel = 'apple' | 'stripe' | 'google'
export type Plan = 'monthly' | 'yearly' | 'lifetime' | 'other'
export type SubStatus = 'active' | 'auto-renew off' | 'billing retry' | 'grace period' | 'expired' | 'revoked'

export interface Purchase {
  family: string
  email: string
  channel: Channel
  plan: Plan
  date: string
  amount: number
  currency: string
  usd: number | null
  country: string | null
  kind: 'purchase' | 'renewal' | 'refunded'
}

export interface Subscriber {
  family: string
  email: string
  channel: Channel
  plan: Plan
  price: number
  currency: string
  usd: number | null
  country: string | null
  since: string
  status: SubStatus
  /** When the current period ends (Apple). */
  periodEnds: string | null
}

export interface RevenueReport {
  generatedAt: string
  totals: {
    grossUsd: number
    thisMonthUsd: number
    mrrUsd: number
    estProceedsUsd: number
    payingFamilies: number
  }
  byCurrency: { currency: string; amount: number }[]
  byChannel: { channel: Channel; grossUsd: number; purchases: number }[]
  subscribers: Subscriber[]
  purchases: Purchase[]
  /** Premium without any purchase behind it (founders, demo, comps). */
  comped: { family: string; email: string }[]
  notes: string[]
}

/**
 * Approximate USD per unit, for one headline number. SAR is pegged; the rest
 * drift, which is why the UI says "≈" and shows per-currency totals too.
 */
const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  SAR: 1 / 3.75,
  MXN: 0.054,
  BRL: 0.18,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
}

export function toUsd(amount: number, currency: string): number | null {
  const rate = USD_PER_UNIT[currency.toUpperCase()]
  return rate == null ? null : Math.round(amount * rate * 100) / 100
}

export function planOf(productOrInterval: string | null | undefined): Plan {
  const s = (productOrInterval ?? '').toLowerCase()
  if (/year|annual/.test(s)) return 'yearly'
  if (/month/.test(s)) return 'monthly'
  if (/lifetime/.test(s)) return 'lifetime'
  return 'other'
}

/** Apple keeps 15% (Small Business Program); Stripe takes 2.9% + $0.30. */
function proceeds(p: Purchase): number {
  if (p.usd == null || p.kind === 'refunded') return 0
  if (p.channel === 'stripe') return Math.max(0, p.usd * 0.971 - 0.3)
  return p.usd * 0.85
}

const round = (n: number) => Math.round(n * 100) / 100

export function summarize(
  purchases: Purchase[],
  subscribers: Subscriber[],
  now = new Date()
): Pick<RevenueReport, 'totals' | 'byCurrency' | 'byChannel'> {
  const counted = purchases.filter((p) => p.kind !== 'refunded')
  const month = now.toISOString().slice(0, 7)
  const usd = (ps: Purchase[]) => round(ps.reduce((s, p) => s + (p.usd ?? 0), 0))

  const currencies = new Map<string, number>()
  for (const p of counted) currencies.set(p.currency, (currencies.get(p.currency) ?? 0) + p.amount)

  // Recurring revenue only counts subscriptions that will renew.
  const mrr = subscribers
    .filter((s) => s.status === 'active' && s.usd != null)
    .reduce((sum, s) => sum + (s.plan === 'yearly' ? s.usd! / 12 : s.plan === 'monthly' ? s.usd! : 0), 0)

  const channels: Channel[] = ['apple', 'stripe', 'google']
  return {
    totals: {
      grossUsd: usd(counted),
      thisMonthUsd: usd(counted.filter((p) => p.date.slice(0, 7) === month)),
      mrrUsd: round(mrr),
      estProceedsUsd: round(counted.reduce((s, p) => s + proceeds(p), 0)),
      payingFamilies: new Set(counted.map((p) => `${p.channel}:${p.email || p.family}`)).size,
    },
    byCurrency: [...currencies]
      .map(([currency, amount]) => ({ currency, amount: round(amount) }))
      .sort((a, b) => (toUsd(b.amount, b.currency) ?? 0) - (toUsd(a.amount, a.currency) ?? 0)),
    byChannel: channels
      .map((channel) => {
        const ps = counted.filter((p) => p.channel === channel)
        return { channel, grossUsd: usd(ps), purchases: ps.length }
      })
      .filter((c) => c.purchases > 0),
  }
}

// --- Apple (App Store Server API) ---

const APPLE_STATUS: Record<number, SubStatus> = {
  1: 'active',
  2: 'expired',
  3: 'billing retry',
  4: 'grace period',
  5: 'revoked',
}

interface AppleTransaction {
  productId: string
  purchaseDate: number
  expiresDate?: number
  price?: number
  currency?: string
  storefront?: string
  transactionReason?: 'PURCHASE' | 'RENEWAL'
  revocationDate?: number
}

const decodeJws = <T>(jws: string): T => JSON.parse(Buffer.from(jws.split('.')[1], 'base64url').toString())

function appleCredentials() {
  const keyId = process.env.APP_STORE_API_KEY_ID
  const issuer = process.env.APP_STORE_API_ISSUER_ID
  // The .p8 contents with real or escaped newlines, or the file base64-encoded.
  let key = process.env.APP_STORE_API_PRIVATE_KEY?.trim().replace(/\\n/g, '\n')
  if (key && !key.includes('BEGIN')) key = Buffer.from(key, 'base64').toString('utf8')
  return keyId && issuer && key ? { keyId, issuer, key } : null
}

function appleToken(creds: { keyId: string; issuer: string; key: string }): string {
  const b64u = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const input = `${b64u({ alg: 'ES256', kid: creds.keyId, typ: 'JWT' })}.${b64u({
    iss: creds.issuer,
    iat: now - 30,
    exp: now + 900,
    aud: 'appstoreconnect-v1',
    bid: 'com.chorestar.ChoreStar',
  })}`
  // ieee-p1363 gives the raw r||s signature a JWT wants.
  const sig = createSign('sha256').update(input).sign({ key: createPrivateKey(creds.key), dsaEncoding: 'ieee-p1363' })
  return `${input}.${sig.toString('base64url')}`
}

async function appleGet(path: string, token: string) {
  const res = await fetch(`https://api.storekit.itunes.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`App Store Server API ${res.status} for ${path.split('?')[0]}`)
  return res.json()
}

async function appleFamily(
  family: { family: string; email: string },
  originalTransactionId: string,
  token: string
): Promise<{ purchases: Purchase[]; subscriber: Subscriber | null }> {
  const txs: AppleTransaction[] = []
  let revision: string | undefined
  for (;;) {
    const q = `sort=DESCENDING${revision ? `&revision=${encodeURIComponent(revision)}` : ''}`
    const page = await appleGet(`/inApps/v2/history/${originalTransactionId}?${q}`, token)
    txs.push(...(page.signedTransactions as string[]).map((j) => decodeJws<AppleTransaction>(j)))
    if (!page.hasMore) break
    revision = page.revision
  }

  const purchases: Purchase[] = txs.map((t) => {
    const amount = (t.price ?? 0) / 1000
    const currency = t.currency ?? 'USD'
    return {
      ...family,
      channel: 'apple',
      plan: planOf(t.productId),
      date: new Date(t.purchaseDate).toISOString(),
      amount,
      currency,
      usd: toUsd(amount, currency),
      country: t.storefront ?? null,
      kind: t.revocationDate ? 'refunded' : t.transactionReason === 'RENEWAL' ? 'renewal' : 'purchase',
    }
  })

  let subscriber: Subscriber | null = null
  const status = await appleGet(`/inApps/v1/subscriptions/${originalTransactionId}`, token)
  const last = status.data?.[0]?.lastTransactions?.[0]
  if (last) {
    const tx = decodeJws<AppleTransaction>(last.signedTransactionInfo)
    const renewal = decodeJws<{ autoRenewStatus: number }>(last.signedRenewalInfo)
    const base = APPLE_STATUS[last.status as number] ?? 'expired'
    const amount = (tx.price ?? 0) / 1000
    const currency = tx.currency ?? 'USD'
    const first = txs[txs.length - 1]
    subscriber = {
      ...family,
      channel: 'apple',
      plan: planOf(tx.productId),
      price: amount,
      currency,
      usd: toUsd(amount, currency),
      country: tx.storefront ?? null,
      since: new Date((first ?? tx).purchaseDate).toISOString(),
      status: base === 'active' && renewal.autoRenewStatus === 0 ? 'auto-renew off' : base,
      periodEnds: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
    }
  }
  return { purchases, subscriber }
}

// --- Stripe ---

async function stripeRevenue(
  stripe: Stripe,
  familyByEmail: Map<string, string>
): Promise<{ purchases: Purchase[]; subscribers: Subscriber[]; emails: Set<string> }> {
  const purchases: Purchase[] = []
  const subscribers: Subscriber[] = []
  const emails = new Set<string>()
  const fam = (email: string) => familyByEmail.get(email.toLowerCase()) ?? email

  for await (const c of stripe.charges.list({ limit: 100 })) {
    if (c.status !== 'succeeded') continue
    const email = (c.billing_details?.email ?? c.receipt_email ?? '').toLowerCase()
    const amount = (c.amount - c.amount_refunded) / 100
    const currency = c.currency.toUpperCase()
    purchases.push({
      family: fam(email),
      email,
      channel: 'stripe',
      plan: planOf(c.description),
      date: new Date(c.created * 1000).toISOString(),
      amount,
      currency,
      usd: toUsd(amount, currency),
      country: c.billing_details?.address?.country ?? null,
      kind: c.refunded ? 'refunded' : 'purchase',
    })
  }

  for await (const s of stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.customer'] })) {
    if (!['active', 'trialing', 'past_due'].includes(s.status)) continue
    const customer = s.customer as Stripe.Customer
    const email = (customer.email ?? '').toLowerCase()
    emails.add(email)
    const item = s.items.data[0]
    const amount = (item?.price.unit_amount ?? 0) / 100
    const currency = (item?.price.currency ?? 'usd').toUpperCase()
    subscribers.push({
      family: fam(email),
      email,
      channel: 'stripe',
      plan: planOf(item?.price.recurring?.interval),
      price: amount,
      currency,
      usd: toUsd(amount, currency),
      country: customer.address?.country ?? null,
      since: new Date(s.created * 1000).toISOString(),
      status: s.status === 'past_due' ? 'billing retry' : s.cancel_at_period_end ? 'auto-renew off' : 'active',
      periodEnds: null,
    })
  }
  return { purchases, subscribers, emails }
}

// --- Report ---

export async function collectRevenue(
  admin: SupabaseClient<Database>,
  stripe: Stripe | null
): Promise<RevenueReport> {
  const notes: string[] = []
  // apple_original_transaction_id and google_purchase_token (migrations 018,
  // 022) are not in the generated types.
  const { data: profiles, error } = await (admin as any)
    .from('profiles')
    .select('id, email, family_name, subscription_type, apple_original_transaction_id, google_purchase_token')
  if (error) throw new Error(`profiles: ${error.message}`)

  type Row = {
    email: string
    family_name: string
    subscription_type: string
    apple_original_transaction_id: string | null
    google_purchase_token: string | null
  }
  const rows = (profiles ?? []) as Row[]
  const familyByEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r.family_name]))
  const purchases: Purchase[] = []
  const subscribers: Subscriber[] = []

  const apple = rows.filter((r) => r.apple_original_transaction_id)
  const creds = appleCredentials()
  if (!creds) {
    if (apple.length) notes.push(`${apple.length} Apple subscriber(s) not shown: set APP_STORE_API_KEY_ID, APP_STORE_API_ISSUER_ID and APP_STORE_API_PRIVATE_KEY.`)
  } else {
    const token = appleToken(creds)
    const results = await Promise.allSettled(
      apple.map((r) =>
        appleFamily({ family: r.family_name, email: r.email }, r.apple_original_transaction_id!, token)
      )
    )
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        purchases.push(...res.value.purchases)
        if (res.value.subscriber) subscribers.push(res.value.subscriber)
      } else {
        notes.push(`Apple lookup failed for ${apple[i].family_name}: ${(res.reason as Error).message}`)
      }
    })
  }

  let stripeEmails = new Set<string>()
  if (stripe) {
    try {
      const s = await stripeRevenue(stripe, familyByEmail)
      purchases.push(...s.purchases)
      subscribers.push(...s.subscribers)
      stripeEmails = s.emails
    } catch (err) {
      notes.push(`Stripe unavailable: ${(err as Error).message}`)
    }
  } else {
    notes.push('Stripe not configured (STRIPE_SECRET_KEY).')
  }

  const google = rows.filter((r) => r.google_purchase_token)
  if (google.length) {
    notes.push(`${google.length} Google Play subscriber(s) linked; Play prices are not read yet, so they are not in the totals.`)
  }

  // Premium with nothing behind it: no Apple history, no live Stripe
  // subscription, no Play token.
  const paidEmails = new Set(purchases.map((p) => p.email.toLowerCase()))
  const comped = rows
    .filter((r) => r.subscription_type !== 'free')
    .filter((r) => !r.apple_original_transaction_id && !r.google_purchase_token)
    .filter((r) => !stripeEmails.has(r.email.toLowerCase()) && !paidEmails.has(r.email.toLowerCase()))
    .map((r) => ({ family: r.family_name, email: r.email }))

  purchases.sort((a, b) => (a.date < b.date ? 1 : -1))
  subscribers.sort((a, b) => (a.since < b.since ? 1 : -1))
  return {
    generatedAt: new Date().toISOString(),
    ...summarize(purchases, subscribers),
    subscribers,
    purchases,
    comped,
    notes,
  }
}
