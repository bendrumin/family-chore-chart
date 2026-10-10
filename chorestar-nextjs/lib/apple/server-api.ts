import { createPrivateKey, createSign } from 'node:crypto'

/**
 * The App Store Server API (api.storekit.itunes.apple.com): transaction
 * history and subscription status, with an App Store Connect API key
 * (APP_STORE_API_KEY_ID / _ISSUER_ID / _PRIVATE_KEY). Shared by the founder
 * hub's Revenue tab and the cross-store downgrade guard.
 */

export interface AppleServerCredentials {
  keyId: string
  issuer: string
  key: string
}

export function appleServerCredentials(): AppleServerCredentials | null {
  const keyId = process.env.APP_STORE_API_KEY_ID
  const issuer = process.env.APP_STORE_API_ISSUER_ID
  // The .p8 contents with real or escaped newlines, or the file base64-encoded.
  let key = process.env.APP_STORE_API_PRIVATE_KEY?.trim().replace(/\\n/g, '\n')
  if (key && !key.includes('BEGIN')) key = Buffer.from(key, 'base64').toString('utf8')
  return keyId && issuer && key ? { keyId, issuer, key } : null
}

export function appleServerToken(creds: AppleServerCredentials): string {
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

export async function appleServerGet(path: string, token: string) {
  const res = await fetch(`https://api.storekit.itunes.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`App Store Server API ${res.status} for ${path.split('?')[0]}`)
  return res.json()
}

/** Apple subscription statuses that still entitle: active, billing retry, grace period. */
export const APPLE_ENTITLED_STATUSES = [1, 3, 4]

/** Is this original transaction's subscription still entitling the family? */
export async function appleSubscriptionActive(originalTransactionId: string, creds: AppleServerCredentials): Promise<boolean> {
  const status = await appleServerGet(`/inApps/v1/subscriptions/${originalTransactionId}`, appleServerToken(creds))
  return (status.data ?? []).some((group: { lastTransactions?: { status: number }[] }) =>
    (group.lastTransactions ?? []).some((t) => APPLE_ENTITLED_STATUSES.includes(t.status))
  )
}
