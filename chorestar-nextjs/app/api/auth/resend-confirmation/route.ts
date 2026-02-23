import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`resend:${ip}`, RATE_LIMITS.EMAIL_RESEND)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many requests. Please wait before trying again.')
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    recordAttempt(`resend:${ip}`, RATE_LIMITS.EMAIL_RESEND)

    const supabase = await createClient()
    const origin = new URL(request.url).origin

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      return NextResponse.json(
        { error: 'Failed to resend confirmation email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend confirmation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
