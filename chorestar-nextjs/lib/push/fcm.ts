import 'server-only'
import crypto from 'node:crypto'
import type { ApnsCustomData } from '@/lib/push/apns'

/**
 * Minimal Firebase Cloud Messaging client (HTTP v1) for the native Android
 * app — the Android half of lib/push/apns.ts, built the same way: a
 * service-account JWT exchanged for an access token, then one POST per
 * device, no SDK.
 *
 * Env (names only; values live in Vercel):
 *   FIREBASE_SERVICE_ACCOUNT_JSON  a service-account key from the Firebase
 *                                  project (raw JSON or base64) with the
 *                                  "Firebase Cloud Messaging API Admin" role.
 *                                  Falls back to GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
 *                                  when the Play service account lives in the
 *                                  same Google Cloud project and has that role.
 *   FIREBASE_PROJECT_ID            optional; defaults to the key's project_id.
 *
 * Wholly env-gated like APNs: unconfigured means every send is a no-op.
 */

interface ServiceAccount { client_email: string; private_key: string; project_id?: string; token_uri?: string }

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const sa = JSON.parse(text) as ServiceAccount
    if (!sa.client_email || !sa.private_key) return null
    return sa
  } catch {
    return null
  }
}

function projectId(sa: ServiceAccount): string | undefined {
  return process.env.FIREBASE_PROJECT_ID?.trim() || sa.project_id
}

export function fcmConfigured(): boolean {
  const sa = loadServiceAccount()
  return Boolean(sa && projectId(sa))
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

let cached: { token: string; expiresAt: number } | null = null

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const now = Math.floor(Date.now() / 1000)
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token'
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }))
  const signature = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), sa.private_key))
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
  })
  if (!res.ok) throw new Error(`FCM token exchange failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

export interface FcmSendResult {
  ok: boolean
  /** True when FCM says this registration token is dead and the row should be deleted. */
  tokenGone: boolean
  status: number
}

/**
 * One data message to one Android device. Data-only on purpose: the app's
 * FirebaseMessagingService builds the notification itself, so the Approve
 * action and the deep link work whether the app is in the foreground or not.
 * High priority so it is delivered promptly on phones in Doze.
 */
export async function sendFcmMessage(
  registrationToken: string,
  title: string,
  body: string,
  custom?: ApnsCustomData
): Promise<FcmSendResult> {
  const sa = loadServiceAccount()
  const project = sa ? projectId(sa) : undefined
  if (!sa || !project) return { ok: false, tokenGone: false, status: 0 }

  const data: Record<string, string> = { title, body }
  if (custom?.type) data.type = custom.type
  if (custom?.childId) data.childId = custom.childId
  if (custom?.completionId) data.completionId = custom.completionId
  if (custom?.category) data.category = custom.category

  const controller = new AbortController()
  const bail = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accessToken(sa)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: registrationToken, data, android: { priority: 'HIGH' } } }),
      signal: controller.signal,
    })
    const text = await res.text()
    // 404 UNREGISTERED: the app was uninstalled or the token rotated away.
    // 400 on a malformed token is just as dead from our side.
    const tokenGone =
      (res.status === 404 && text.includes('UNREGISTERED')) ||
      (res.status === 400 && /registration token|not a valid FCM registration token/i.test(text))
    const line = `[push] fcm status=${res.status} token=${registrationToken.slice(0, 8)}…${res.ok ? '' : ` body=${text}`}`
    if (res.ok) console.log(line)
    else console.error(line)
    return { ok: res.ok, tokenGone, status: res.status }
  } catch (err) {
    console.error(`[push] fcm request error: ${err instanceof Error ? err.message : String(err)}`)
    return { ok: false, tokenGone: false, status: 0 }
  } finally {
    clearTimeout(bail)
  }
}
