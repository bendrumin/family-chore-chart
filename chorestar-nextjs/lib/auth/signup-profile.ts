/**
 * One way to turn a fresh auth user into a ChoreStar family, whatever the
 * sign-in method.
 *
 * Email signup (POST /api/auth/signup), a web OAuth return (/auth/callback) and
 * a native Apple/Google sign-in (POST /api/auth/ensure-profile) all end here, so
 * every family gets the same row: a kid login code from the first minute and a
 * signup_source for attribution. Before this, the OAuth path upserted a bare
 * profile with neither, which meant kid login read "invalid code" and the
 * signup vanished from the attribution report.
 *
 * The rules are pure and the writer takes its client as an argument, so the
 * whole file is unit-testable without Supabase (signup-profile.test.ts).
 */
import crypto from 'crypto'
import type { PostgrestError } from '@supabase/supabase-js'

// Lives with the client-side attribution code so the sign-in buttons can
// set it without bundling this server file.
export { ATTRIBUTION_COOKIE } from '../utils/attribution'

export type SignupPlatform = 'web' | 'ios_app' | 'android_app'

/**
 * Tag the platform from the User-Agent. iOS-app requests are CFNetwork/Darwin
 * with no Mozilla; the native Android app sends ChoreStarAndroid/<version>
 * deliberately, since Ktor sends no User-Agent by default and those signups
 * used to be counted as web.
 */
export function platformFromUserAgent(ua: string | null | undefined): SignupPlatform {
  const s = ua || ''
  if (s.includes('ChoreStarAndroid')) return 'android_app'
  if (/CFNetwork|Darwin/.test(s) && !s.includes('Mozilla')) return 'ios_app'
  return 'web'
}

const ALLOWED_SOURCE_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'referrer', 'landing', 'captured_at',
] as const

/**
 * Sanitize a client-supplied first-touch record (migration 021): allowlisted
 * keys, non-empty strings, clipped to 200 chars. `method` records how the
 * account was created, so the report can split email from Apple and Google.
 */
export function buildSignupSource(
  raw: unknown,
  platform: SignupPlatform,
  method: string = 'email'
): Record<string, string> {
  const out: Record<string, string> = { platform, method }
  if (raw && typeof raw === 'object') {
    for (const k of ALLOWED_SOURCE_KEYS) {
      const v = (raw as Record<string, unknown>)[k]
      if (typeof v === 'string' && v.length > 0) out[k] = v.slice(0, 200)
    }
  }
  return out
}

/**
 * The family name to store. An explicit name wins; otherwise fall back to what
 * the provider gave us. `defaulted` tells the client to ask the parent to name
 * their family, since "Jane" or an email prefix is a placeholder, not a choice.
 */
export function resolveFamilyName(
  explicit: unknown,
  metadata: Record<string, unknown> | null | undefined,
  email: string | null | undefined
): { name: string; defaulted: boolean } {
  const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 100) : '')
  const given = clean(explicit) || clean(metadata?.family_name)
  if (given) return { name: given, defaulted: false }
  const fallback = clean(metadata?.full_name) || clean(metadata?.name) || clean(email?.split('@')[0])
  return { name: fallback || 'My Family', defaulted: true }
}

// The narrow slice of the service-role client this file uses, so tests can
// pass a fake. Profiles columns from migrations 018+ are not in the generated
// types, hence the loose row type.
export interface ProfileWriter {
  from(table: 'profiles'): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: PostgrestError | null }>
    select(cols: string): {
      eq(col: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown }> }
    }
  }
}

export interface EnsureProfileInput {
  id: string
  email: string
  familyName: string
  signupSource: Record<string, string>
}

/**
 * Insert the profile if it does not exist yet. `created` is false when the row
 * was already there (a returning user, or a retry), which callers treat as
 * success. Retries only on a kid-code collision, and drops signup_source if
 * migration 021 is not applied so attribution can never block account creation.
 */
export async function ensureProfile(
  admin: ProfileWriter,
  input: EnsureProfileInput
): Promise<{ created: boolean; error: PostgrestError | null }> {
  let includeSource = true
  for (let attempt = 0; attempt < 4; attempt++) {
    const row: Record<string, unknown> = {
      id: input.id,
      email: input.email,
      family_name: input.familyName,
      kid_login_code: crypto.randomBytes(4).toString('hex'),
    }
    if (includeSource) row.signup_source = input.signupSource
    const { error } = await admin.from('profiles').insert(row)
    if (!error) return { created: true, error: null }
    if (includeSource && (error.code === 'PGRST204' || /signup_source/.test(error.message))) {
      includeSource = false
      continue
    }
    if (error.code !== '23505') return { created: false, error }
    // 23505 is either "profile already exists" or a kid-code collision; only
    // the latter retries.
    const { data: existing } = await admin.from('profiles').select('id').eq('id', input.id).maybeSingle()
    if (existing) return { created: false, error: null }
  }
  return { created: false, error: { code: 'KIDCODE', message: 'could not allocate a unique kid login code', details: '', hint: '' } as PostgrestError }
}
