import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { validatePassword } from '@/lib/utils/validation'
import crypto from 'crypto'
import type { PostgrestError } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = await checkRateLimit(`signup:${ip}`, RATE_LIMITS.AUTH_SIGNUP)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many signup attempts. Please try again later.')
    }

    const body = await request.json()
    const { email, password, familyName, honeypot } = body

    // Signup attribution (migration 021): sanitize the client-supplied
    // first-touch record (allowlisted keys, clipped strings) and tag the
    // platform from the User-Agent, which also classifies iOS-app signups
    // (CFNetwork/Darwin, no Mozilla) with no app change.
    const ua = request.headers.get('user-agent') || ''
    const platform = ua.includes('ChoreStarAndroid')
      ? 'android_shell'
      : /CFNetwork|Darwin/.test(ua) && !ua.includes('Mozilla')
        ? 'ios_app'
        : 'web'
    const ALLOWED_SOURCE_KEYS = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'referrer', 'landing', 'captured_at',
    ] as const
    const signupSource: Record<string, string> = { platform }
    if (body.signupSource && typeof body.signupSource === 'object') {
      for (const k of ALLOWED_SOURCE_KEYS) {
        const v = (body.signupSource as Record<string, unknown>)[k]
        if (typeof v === 'string' && v.length > 0) signupSource[k] = v.slice(0, 200)
      }
    }

    if (honeypot) {
      return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const passwordStr = String(password)
    const normalizedFamilyName = String(familyName || 'My Family').trim().slice(0, 100) || 'My Family'

    // Validate email format server-side (client validates too)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Enforce password strength server-side, not just in the browser
    const passwordError = validatePassword(passwordStr)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    await recordAttempt(`signup:${ip}`, RATE_LIMITS.AUTH_SIGNUP)

    const supabase = await createClient()
    const origin = new URL(request.url).origin

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: passwordStr,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: { family_name: normalizedFamilyName },
      },
    })

    if (error) {
      // Log the real reason server-side but return a generic message so we don't
      // reveal whether an email is already registered (user enumeration).
      console.error('Signup error:', error.message)
      return NextResponse.json(
        { error: 'Unable to create your account. Please check your details and try again.' },
        { status: 400 }
      )
    }

    if (data.user) {
      // Create the profile with the service-role client (bypasses RLS). Right
      // after signUp there is no user session yet (email-confirmation flow), so
      // the anon client is blocked by the profiles "auth.uid() = id" INSERT
      // policy (error 42501) — which previously triggered the rollback below and
      // deleted the freshly created account.
      const admin = createServiceRoleClient()
      // The kid login code is seeded at signup so kid mode works from the
      // first minute. It used to be generated lazily by /api/kid-login-code,
      // which only the web settings page called — a family created on iOS
      // had no code at all, and every code typed at kid login read "invalid".
      let profileError: PostgrestError | null = null
      // Dropped automatically if migration 021 is not applied yet (PGRST204,
      // "column not found") so attribution can never block account creation.
      let includeSource = true
      for (let attempt = 0; attempt < 3; attempt++) {
        const row: Record<string, unknown> = {
          id: data.user.id,
          email: data.user.email || normalizedEmail,
          family_name: normalizedFamilyName,
          kid_login_code: crypto.randomBytes(4).toString('hex'),
        }
        if (includeSource) row.signup_source = signupSource
        const { error } = await (admin.from('profiles') as ReturnType<typeof admin.from>).insert(row as never)
        profileError = error
        if (error && includeSource && (error.code === 'PGRST204' || /signup_source/.test(error.message))) {
          includeSource = false
          continue
        }
        if (!error || error.code !== '23505') break
        // 23505 is either "profile already exists" (keep original semantics,
        // handled below) or a code collision — only the latter retries.
        const { data: existing } = await admin
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle()
        if (existing) break
      }

      // Mark the address confirmed so the account works the moment it is
      // created. Supabase requires confirmation by default, which meant a brand
      // new account could sign up and then be refused at sign-in with "Email
      // not confirmed" until a link was clicked — App Review hit exactly that
      // and rejected 1.4 under guideline 2.1(a).
      //
      // The tradeoff is deliberate: no proof the address is owned by the person
      // signing up. It is the same tradeoff most consumer apps make, and the
      // address is only used for password reset, which is itself a
      // proof-of-ownership challenge.
      const { error: confirmError } = await admin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      })
      if (confirmError) {
        // Not fatal: the account exists and the confirmation email still went
        // out, so the user can confirm the slow way.
        console.error('Failed to auto-confirm email after signup:', confirmError)
      }

      // Ignore duplicate (already exists); otherwise roll back the auth user so
      // this email isn't left in a broken half-created state.
      if (profileError && profileError.code !== '23505') {
        console.error('Profile creation failed after signup:', profileError)
        try {
          await admin.auth.admin.deleteUser(data.user.id)
        } catch (rollbackError) {
          console.error('Failed to roll back auth user after profile error:', rollbackError)
        }
        return NextResponse.json(
          { error: 'Something went wrong creating your account. Please try again.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
