import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import {
  buildSignupSource, ensureProfile, platformFromUserAgent, resolveFamilyName, type ProfileWriter,
} from '@/lib/auth/signup-profile'
import { storeTokenFromAuthorizationCode, usesApple } from '@/lib/apple/sign-in'

/**
 * POST /api/auth/ensure-profile  { familyName?, signupSource?, appleAuthorizationCode? }
 *
 * Called by the iOS and Android apps right after a native Sign in with Apple or
 * Google (Bearer access token from signInWithIdToken). Those sign-ins go
 * straight to Supabase and never touch /api/auth/signup, so this is where the
 * family row, its kid login code and its attribution get made. Safe to call on
 * every sign-in: a returning user's profile is left exactly as it is.
 *
 * appleAuthorizationCode is the one-time code from the iOS credential. It is
 * swapped for a refresh token and kept so account deletion can revoke it,
 * which App Review checks. Best-effort: a failed exchange never blocks sign-in.
 *
 * Returns { created, needsFamilyName }. needsFamilyName is true when a new
 * family was named from the provider's display name or email prefix, so the
 * app should ask the parent to pick a real one.
 */
export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    // An empty body is fine: every field is optional.
  }

  try {
    const admin = createServiceRoleClient()
    const { data, error: userError } = await admin.auth.admin.getUserById(userId)
    if (userError || !data.user) throw userError ?? new Error('auth user not found')
    const user = data.user

    const { name, defaulted } = resolveFamilyName(body.familyName, user.user_metadata, user.email)
    const { created, error } = await ensureProfile(admin as unknown as ProfileWriter, {
      id: user.id,
      email: user.email || '',
      familyName: name,
      signupSource: buildSignupSource(
        body.signupSource,
        platformFromUserAgent(request.headers.get('user-agent')),
        String(user.app_metadata?.provider || 'email')
      ),
    })
    if (error) throw error

    const code = body.appleAuthorizationCode
    if (typeof code === 'string' && code && usesApple(user)) {
      await storeTokenFromAuthorizationCode(admin, user.id, code)
    }

    return NextResponse.json({ created, needsFamilyName: created && defaulted })
  } catch (error) {
    console.error('ensure-profile failed:', error)
    return NextResponse.json({ error: 'Could not set up your family. Please try again.' }, { status: 500 })
  }
}
