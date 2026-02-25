import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkRateLimit, recordAttempt, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'

const RATE_LIMIT = { maxAttempts: 3, windowMs: 60 * 60 * 1000 } // 3 per hour per IP

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`testflight:${ip}`, RATE_LIMIT)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many signups from this IP. Please try again later.')
    }

    const body = await request.json()
    const { email, name, honeypot } = body

    if (honeypot) {
      return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }

    recordAttempt(`testflight:${ip}`, RATE_LIMIT)

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      console.error('TestFlight signup: Service role client not configured')
      return NextResponse.json({ error: 'Signup temporarily unavailable. Please email hi@chorestar.app.' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await admin.from('testflight_waitlist').insert({
      email: String(email).slice(0, 200).toLowerCase().trim(),
      name: name ? String(name).slice(0, 100).trim() : null,
      source: request.headers.get('referer') || 'direct',
    } as any)

    if (dbError) {
      // Unique constraint = already signed up
      if (dbError.code === '23505') {
        return NextResponse.json({ success: true, alreadySignedUp: true })
      }
      console.error('TestFlight signup DB error:', dbError)
      return NextResponse.json({ error: 'Failed to sign up. Please try again.' }, { status: 500 })
    }

    // Email notification
    const resendApiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || 'hi@chorestar.app'

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        await resend.emails.send({
          from: 'ChoreStar <noreply@chorestar.app>',
          to: adminEmail,
          subject: `📱 New iOS TestFlight Signup: ${name || email}`,
          html: `
<div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">📱 New TestFlight Signup</h1>
  </div>
  <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 12px;"><strong>Email:</strong> ${String(email).replace(/</g, '&lt;')}</p>
    ${name ? `<p style="margin: 0 0 12px;"><strong>Name:</strong> ${String(name).replace(/</g, '&lt;')}</p>` : ''}
    <p style="margin: 0; color: #6b7280; font-size: 13px;">Signed up at ${new Date().toLocaleString()}</p>
  </div>
</div>`,
        })
      } catch (emailErr) {
        console.error('TestFlight signup email error:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('TestFlight signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
