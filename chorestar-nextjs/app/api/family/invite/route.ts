import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import crypto from 'crypto'

// POST /api/family/invite — send an email invite to join the family
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await request.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  // Get inviter's family name
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_name')
    .eq('id', user.id)
    .single()

  const familyName = profile?.family_name || 'Your family'

  // Check for existing pending invite to this email
  const admin = createServiceRoleClient()
  const { data: existing } = await (admin as any)
    .from('family_invites')
    .select('id, status')
    .eq('family_id', user.id)
    .eq('invited_email', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle()

  let code: string
  if (existing) {
    // Resend: update expires_at and reuse
    const { data: updated } = await (admin as any)
      .from('family_invites')
      .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', existing.id)
      .select('code')
      .single()
    code = updated.code
  } else {
    // Generate unique code
    code = crypto.randomBytes(6).toString('hex')
    const { error: insertError } = await (admin as any)
      .from('family_invites')
      .insert({
        family_id: user.id,
        invited_email: email.toLowerCase(),
        code,
      })

    if (insertError) {
      console.error('Failed to create invite:', insertError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }
  }

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chorestar.app'
    const acceptUrl = `${baseUrl}/family/accept/${code}`

    await resend.emails.send({
      from: 'ChoreStar <noreply@chorestar.app>',
      to: email,
      subject: `${familyName} invited you to ChoreStar 🌟`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">👨‍👩‍👧‍👦</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">You're invited to join ChoreStar!</h1>
    </div>
    <div style="padding:36px 32px;">
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 16px;">
        <strong>${familyName}</strong> has invited you to join their family on ChoreStar — the app that helps families manage chores and daily routines together.
      </p>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
        As a family member you'll have full access to manage children, chores, and routines — perfect for co-parents and guardians.
      </p>
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${acceptUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
          Accept Invitation →
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        This invite expires in 7 days. If you don't have a ChoreStar account, you'll be prompted to create one (it's free).
      </p>
    </div>
    <div style="background:#f1f5f9;padding:20px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        If you weren't expecting this, you can safely ignore it.<br>
        <a href="https://chorestar.app" style="color:#6366f1;">chorestar.app</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    }).catch(err => console.error('Resend error:', err))
  }

  return NextResponse.json({ success: true })
}
