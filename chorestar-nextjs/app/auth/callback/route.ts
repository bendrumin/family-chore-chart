import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  ATTRIBUTION_COOKIE, buildSignupSource, ensureProfile, platformFromUserAgent, resolveFamilyName,
  type ProfileWriter,
} from '@/lib/auth/signup-profile'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') || '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Unable to confirm email. Please try again.')}`, requestUrl.origin)
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // A no-op for email accounts (their profile was made at signup); for a
      // first OAuth sign-in it creates the family with a kid login code and
      // attribution. Service role, like the signup route: the profile insert
      // must not depend on RLS timing.
      const cookieStore = await cookies()
      let attribution: unknown = null
      try {
        const raw = cookieStore.get(ATTRIBUTION_COOKIE)?.value
        if (raw) attribution = JSON.parse(decodeURIComponent(raw))
      } catch {
        /* malformed cookie: attribution is best-effort */
      }
      const { name } = resolveFamilyName(null, user.user_metadata, user.email)
      const { error: profileError } = await ensureProfile(
        createServiceRoleClient() as unknown as ProfileWriter,
        {
          id: user.id,
          email: user.email || '',
          familyName: name,
          signupSource: buildSignupSource(
            attribution,
            platformFromUserAgent(request.headers.get('user-agent')),
            String(user.app_metadata?.provider || 'email')
          ),
        }
      )
      if (profileError) {
        console.error('Error ensuring OAuth profile:', profileError)
      }
      cookieStore.delete(ATTRIBUTION_COOKIE)
    }

    // Successful confirmation - redirect to dashboard or specified next URL
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code present, redirect to login
  return NextResponse.redirect(
    new URL('/login?error=No confirmation code found', requestUrl.origin)
  )
}
