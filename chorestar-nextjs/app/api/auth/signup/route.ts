import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { validatePassword } from '@/lib/utils/validation'
import { buildSignupSource, ensureProfile, platformFromUserAgent, type ProfileWriter } from '@/lib/auth/signup-profile'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = await checkRateLimit(`signup:${ip}`, RATE_LIMITS.AUTH_SIGNUP)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many signup attempts. Please try again later.')
    }

    const body = await request.json()
    const { email, password, familyName, honeypot } = body

    // Signup attribution (migration 021): the sanitized first-touch record
    // plus the platform from the User-Agent. See lib/auth/signup-profile.ts.
    const signupSource = buildSignupSource(
      body.signupSource,
      platformFromUserAgent(request.headers.get('user-agent')),
      'email'
    )

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
      // The kid login code is seeded here so kid mode works from the first
      // minute; a family created on iOS once had no code at all, and every
      // code typed at kid login read "invalid".
      const { error: profileError } = await ensureProfile(admin as unknown as ProfileWriter, {
        id: data.user.id,
        email: data.user.email || normalizedEmail,
        familyName: normalizedFamilyName,
        signupSource,
      })

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

      // A profile that already existed is not an error (ensureProfile returns
      // null for it); anything else rolls back the auth user so this email
      // isn't left in a broken half-created state.
      if (profileError) {
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
