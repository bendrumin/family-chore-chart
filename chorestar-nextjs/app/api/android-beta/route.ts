import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkRateLimit, recordAttempt, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit'

/**
 * POST /api/android-beta  { email, name?, honeypot? }
 *
 * Signups for the Google Play test. Rows land in `testflight_waitlist` with
 * source 'android-beta': the table is just a list of emails and a source, and
 * the name predates Android, so a second table would buy nothing. That table
 * is not in the generated Supabase types, hence the `as any`, the same cast
 * the account-delete purge uses.
 *
 * Play only lets a tester opt in once their Google account is on the track's
 * tester list, so these addresses are the queue for that list.
 */
const RATE_LIMIT = { maxAttempts: 3, interval: 60 * 60 * 1000 } // 3 per hour per IP
// Route files may only export route handlers, so this stays local.
const SOURCE = 'android-beta'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = await checkRateLimit(`android-beta:${ip}`, RATE_LIMIT)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many signups from this IP. Please try again later.')
    }

    const body = await request.json()
    const { email, name, honeypot } = body

    if (honeypot) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }

    await recordAttempt(`android-beta:${ip}`, RATE_LIMIT)

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      console.error('Android beta signup: service role client not configured')
      return NextResponse.json({ error: 'Signup temporarily unavailable. Please email hi@chorestar.app.' }, { status: 500 })
    }

    const cleanEmail = String(email).slice(0, 200).toLowerCase().trim()
    const cleanName = name ? String(name).slice(0, 100).trim() : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (admin as any).from('testflight_waitlist').insert({
      email: cleanEmail,
      name: cleanName,
      source: SOURCE,
    })

    if (dbError) {
      // Unique constraint: the address is already on the list, which is a success
      // from the visitor's side. It can also mean they signed up for the iOS test.
      if (dbError.code === '23505') return NextResponse.json({ success: true, alreadySignedUp: true })
      console.error('Android beta signup DB error:', dbError)
      return NextResponse.json({ error: 'Failed to sign up. Please try again.' }, { status: 500 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_EMAIL || 'hi@chorestar.app'
    if (resendApiKey) {
      try {
        const esc = (s: string) => s.replace(/</g, '&lt;')
        await new Resend(resendApiKey).emails.send({
          from: 'ChoreStar <noreply@chorestar.app>',
          to: adminEmail,
          subject: `🤖 New Android beta signup: ${cleanName || cleanEmail}`,
          html: `
<div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <div style="background: #5e61e5; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">🤖 New Android beta signup</h1>
  </div>
  <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 12px;"><strong>Email:</strong> ${esc(cleanEmail)}</p>
    ${cleanName ? `<p style="margin: 0 0 12px;"><strong>Name:</strong> ${esc(cleanName)}</p>` : ''}
    <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">
      Add this address to the closed test's tester list in Play Console, then they can opt in.
    </p>
    <p style="margin: 0; color: #6b7280; font-size: 13px;">Signed up at ${new Date().toLocaleString()}</p>
  </div>
</div>`,
        })
      } catch (emailErr) {
        console.error('Android beta signup email error:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Android beta signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
