import crypto from 'crypto'
import { PLAY_PACKAGE_NAME } from './play-billing'

/**
 * Minimal Google Play Developer API client: a service-account JWT exchanged
 * for an access token (RS256, no SDK), then purchases.subscriptionsv2.get
 * and the v1 acknowledge call. Env (names only; values live in Vercel):
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  the service account key file's JSON,
 *                                     raw or base64
 *   GOOGLE_PLAY_PACKAGE_NAME          defaults to com.chorestar.app
 */

interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured')
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  const sa = JSON.parse(text) as ServiceAccount
  if (!sa.client_email || !sa.private_key) throw new Error('Service account JSON is missing client_email or private_key')
  return sa
}

export function packageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME || PLAY_PACKAGE_NAME
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

let cached: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const sa = loadServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signature = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), sa.private_key))
  const assertion = `${header}.${claims}.${signature}`

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

export interface SubscriptionPurchaseV2 {
  kind?: string
  subscriptionState?: string
  latestOrderId?: string
  linkedPurchaseToken?: string
  acknowledgementState?: string
  testPurchase?: object
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string; obfuscatedExternalProfileId?: string }
  lineItems?: { productId?: string; expiryTime?: string; offerDetails?: { basePlanId?: string; offerId?: string } }[]
}

export async function getSubscriptionV2(purchaseToken: string): Promise<SubscriptionPurchaseV2> {
  const token = await getAccessToken()
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName()}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`subscriptionsv2.get failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as SubscriptionPurchaseV2
}

/**
 * Play refunds un-acknowledged subscriptions after three days. The shell
 * acknowledges through the Billing Library; this is the server-side belt
 * to those braces.
 */
export async function acknowledgeSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
  const token = await getAccessToken()
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName()}/purchases/subscriptions/${encodeURIComponent(subscriptionId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' })
  if (!res.ok && res.status !== 400) throw new Error(`acknowledge failed: ${res.status} ${await res.text()}`)
}
