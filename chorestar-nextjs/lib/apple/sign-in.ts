/**
 * Sign in with Apple, server side: exchanging an app's one-time authorization
 * code for a refresh token, and revoking that token when the account is
 * deleted. App Review requires the revoke (guideline 5.1.1(v)): deleting an
 * account must also cut the link Sign in with Apple made, which is what makes
 * "Stop using Apple ID" show the app as gone in the user's Apple settings.
 *
 * Both calls authenticate with a client secret: an ES256 JWT signed with the
 * Sign in with Apple key (not the App Store Connect key). The secret here is
 * minted per request and lives five minutes; the six-month one in Supabase's
 * Apple provider is separate (scripts/apple-client-secret.mjs).
 *
 * Env: APPLE_SIGNIN_KEY_ID, APPLE_SIGNIN_PRIVATE_KEY (the .p8 contents, raw,
 * with escaped newlines, or base64), APPLE_TEAM_ID (defaults to ChoreStar's).
 */
import { createPrivateKey, createSign } from 'crypto'

export const APPLE_TEAM_ID_DEFAULT = '5ANRA6JZC2'
/** The audience of tokens minted by the iOS app's native sign-in. */
export const APPLE_IOS_CLIENT_ID = 'com.chorestar.ChoreStar'
/** The Services ID Supabase's web OAuth flow uses. */
export const APPLE_WEB_CLIENT_ID = 'com.chorestar.web'

const APPLE = 'https://appleid.apple.com'

/**
 * Has this auth user ever signed in with Apple? `provider` is only the first
 * method; an email family that later signs in with Apple (linked by matching
 * address) shows up in `providers`.
 */
export function usesApple(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  const meta = user?.app_metadata ?? {}
  const providers = Array.isArray(meta.providers) ? meta.providers : [meta.provider]
  return providers.includes('apple')
}

/** Accept the .p8 as pasted (real or escaped newlines) or base64-encoded. */
export function normalizePrivateKey(raw: string): string {
  const s = raw.trim().replace(/^"|"$/g, '')
  if (s.includes('BEGIN PRIVATE KEY')) return s.replace(/\\n/g, '\n')
  return Buffer.from(s, 'base64').toString('utf8')
}

export function appleConfig(env: NodeJS.ProcessEnv = process.env) {
  const keyId = env.APPLE_SIGNIN_KEY_ID?.trim()
  const privateKey = env.APPLE_SIGNIN_PRIVATE_KEY?.trim()
  if (!keyId || !privateKey) return null
  return { keyId, privateKey: normalizePrivateKey(privateKey), teamId: env.APPLE_TEAM_ID?.trim() || APPLE_TEAM_ID_DEFAULT }
}

type AppleConfig = NonNullable<ReturnType<typeof appleConfig>>

const b64u = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')

export function clientSecret(cfg: AppleConfig, clientId: string, now = Math.floor(Date.now() / 1000)): string {
  const input = `${b64u({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' })}.${b64u({
    iss: cfg.teamId,
    iat: now,
    exp: now + 300,
    aud: APPLE,
    sub: clientId,
  })}`
  // ieee-p1363 gives the raw r||s signature a JWT wants (DER is the default).
  const sig = createSign('sha256').update(input).sign({ key: createPrivateKey(cfg.privateKey), dsaEncoding: 'ieee-p1363' })
  return `${input}.${sig.toString('base64url')}`
}

async function post(path: string, form: Record<string, string>, fetcher: typeof fetch) {
  return fetcher(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  })
}

/** Trade the app's one-time authorization code for a long-lived refresh token. */
export async function exchangeAuthorizationCode(
  cfg: AppleConfig,
  code: string,
  clientId: string,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const res = await post('/auth/token', {
    client_id: clientId,
    client_secret: clientSecret(cfg, clientId),
    code,
    grant_type: 'authorization_code',
  }, fetcher)
  const json = (await res.json().catch(() => ({}))) as { refresh_token?: string; error?: string }
  if (!res.ok || !json.refresh_token) throw new Error(`apple token exchange: ${res.status} ${json.error ?? ''}`.trim())
  return json.refresh_token
}

/** Revoke a refresh token. Apple answers 200 even for one already revoked. */
export async function revokeRefreshToken(
  cfg: AppleConfig,
  refreshToken: string,
  clientId: string,
  fetcher: typeof fetch = fetch
): Promise<void> {
  const res = await post('/auth/revoke', {
    client_id: clientId,
    client_secret: clientSecret(cfg, clientId),
    token: refreshToken,
    token_type_hint: 'refresh_token',
  }, fetcher)
  if (!res.ok) throw new Error(`apple revoke: ${res.status} ${await res.text().catch(() => '')}`.trim())
}

// apple_sign_in_tokens (migration 023) is not in the generated types, so these
// take the service-role client loosely, like the Apple and Play webhook routes.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Exchange and keep the iOS app's authorization code. Best-effort: a sign-in never fails on it. */
export async function storeTokenFromAuthorizationCode(admin: any, userId: string, code: string): Promise<boolean> {
  const cfg = appleConfig()
  if (!cfg) {
    console.error('apple sign-in: APPLE_SIGNIN_KEY_ID / APPLE_SIGNIN_PRIVATE_KEY not set; cannot keep a token to revoke later')
    return false
  }
  try {
    const refreshToken = await exchangeAuthorizationCode(cfg, code, APPLE_IOS_CLIENT_ID)
    return storeRefreshToken(admin, userId, APPLE_IOS_CLIENT_ID, refreshToken)
  } catch (error) {
    console.error('apple sign-in: code exchange failed:', error)
    return false
  }
}

export async function storeRefreshToken(admin: any, userId: string, clientId: string, refreshToken: string): Promise<boolean> {
  const { error } = await admin
    .from('apple_sign_in_tokens')
    .upsert({ user_id: userId, client_id: clientId, refresh_token: refreshToken, updated_at: new Date().toISOString() })
  if (error) console.error('apple sign-in: storing refresh token failed:', error)
  return !error
}

/**
 * Called by account deletion before the auth user goes. `revoked` is false
 * with `failed` false when there was simply nothing to revoke (an email
 * account, or migration 023 not applied).
 */
export async function revokeAppleTokensFor(admin: any, userId: string): Promise<{ revoked: boolean; failed: boolean }> {
  const { data, error } = await admin
    .from('apple_sign_in_tokens')
    .select('client_id, refresh_token')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return { revoked: false, failed: false }
  const cfg = appleConfig()
  if (!cfg) {
    console.error('apple sign-in: cannot revoke, signing key not configured')
    return { revoked: false, failed: true }
  }
  try {
    await revokeRefreshToken(cfg, data.refresh_token, data.client_id)
    return { revoked: true, failed: false }
  } catch (err) {
    console.error('apple sign-in: revoke failed:', err)
    return { revoked: false, failed: true }
  }
}
