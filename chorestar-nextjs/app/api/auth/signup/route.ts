import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`signup:${ip}`, RATE_LIMITS.AUTH_SIGNUP)
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

    recordAttempt(`signup:${ip}`, RATE_LIMITS.AUTH_SIGNUP)

    const supabase = await createClient()
    const origin = new URL(request.url).origin

    const { data, error } = await supabase.auth.signUp({
      email: String(email),
      password: String(password),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: { family_name: String(familyName || 'My Family') },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email || String(email),
        family_name: String(familyName || 'My Family'),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
