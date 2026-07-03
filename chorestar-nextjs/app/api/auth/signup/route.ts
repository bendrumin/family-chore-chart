import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { validatePassword } from '@/lib/utils/validation'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = await checkRateLimit(`signup:${ip}`, RATE_LIMITS.AUTH_SIGNUP)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many signup attempts. Please try again later.')
    }

    const body = await request.json()
    const { email, password, familyName, honeypot } = body

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
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email || normalizedEmail,
        family_name: normalizedFamilyName,
      })

      // Profile creation failed (ignore duplicate = already exists): roll back
      // the auth user so this email isn't left in a broken half-created state.
      if (profileError && profileError.code !== '23505') {
        console.error('Profile creation failed after signup:', profileError)
        try {
          const admin = createServiceRoleClient()
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
