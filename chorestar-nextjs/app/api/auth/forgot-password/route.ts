import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`pwreset:${ip}`, RATE_LIMITS.PASSWORD_RESET)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many password reset requests. Please wait before trying again.')
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    recordAttempt(`pwreset:${ip}`, RATE_LIMITS.PASSWORD_RESET)

    const supabase = await createClient()
    const origin = new URL(request.url).origin

    const { error } = await supabase.auth.resetPasswordForEmail(String(email), {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
