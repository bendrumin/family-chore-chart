import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkRateLimit, recordAttempt, RATE_LIMITS, getClientIp, createRateLimitResponse } from '@/lib/utils/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`contact:${ip}`, RATE_LIMITS.CONTACT_FORM);
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many messages. Please wait before trying again.');
    }

    const body = await request.json();
    const { name, email, subject, message, honeypot } = body;

    if (honeypot) {
      return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    recordAttempt(`contact:${ip}`, RATE_LIMITS.CONTACT_FORM);

    // Optional: get user if logged in (for context)
    let userId: string | null = null;
    let familyName = 'Unknown';
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('family_name')
          .eq('id', user.id)
          .single();
        familyName = (profile?.family_name as string) || 'Unknown';
      }
    } catch {
      // Continue without user context
    }

    // Use service role to insert (bypasses RLS, ensures contact works for everyone)
    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      console.error('Contact API: Service role client not configured');
      return NextResponse.json(
        { error: 'Contact form temporarily unavailable. Please email hi@chorestar.app directly.' },
        { status: 500 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase types incomplete for contact_submissions schema
    const { error: dbError } = await admin.from('contact_submissions').insert({
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 200),
      subject: String(subject).slice(0, 100),
      message: String(message).slice(0, 5000),
      user_id: userId,
      family_name: familyName,
      user_agent: request.headers.get('user-agent') || null,
      url: request.headers.get('referer') || null,
    } as any);

    if (dbError) {
      console.error('Contact form DB error:', dbError);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

    // Send email notification via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'hi@chorestar.app';

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'ChoreStar <noreply@chorestar.app>',
          to: adminEmail,
          replyTo: String(email),
          subject: `📧 ChoreStar Contact: ${String(subject).slice(0, 100)} - From ${String(name).slice(0, 100)}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
    .field { margin-bottom: 20px; }
    .field-label { font-weight: 600; color: #495057; margin-bottom: 5px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-value { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; font-size: 15px; }
    .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; }
    .footer { margin-top: 20px; text-align: center; color: #6c757d; font-size: 13px; }
    .badge { display: inline-block; background: #6366f1; color: white; padding: 3px 8px; border-radius: 10px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⭐ New Contact Form Submission</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">ChoreStar</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">👤 Name</div>
        <div class="field-value">${String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
      <div class="field">
        <div class="field-label">📧 Email</div>
        <div class="field-value"><a href="mailto:${String(email).replace(/</g, '&lt;')}" style="color: #6366f1;">${String(email).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></div>
      </div>
      <div class="field">
        <div class="field-label">📝 Subject</div>
        <div class="field-value">${String(subject).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
      ${familyName !== 'Unknown' ? `
      <div class="field">
        <div class="field-label">👨‍👩‍👧 Family</div>
        <div class="field-value">${String(familyName).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>` : ''}
      <div class="field">
        <div class="field-label">💬 Message</div>
        <div class="message-box">${String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
      </div>
      <div style="margin-top: 20px; padding: 15px; background: #e0e7ff; border-radius: 8px;">
        <strong>Timestamp:</strong> ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
      </div>
    </div>
    <div class="footer">
      <p>Sent from <a href="https://chorestar.app" style="color: #6366f1;">chorestar.app</a> contact form</p>
      <p><a href="mailto:${String(email).replace(/</g, '&lt;')}?subject=Re: ${encodeURIComponent(String(subject))}" style="color: #6366f1;">Reply to ${String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></p>
    </div>
  </div>
</body>
</html>`,
        });
      } catch (emailErr: any) {
        // Log but don't fail — submission is already saved to DB
        console.error('Contact email send error:', emailErr?.message || emailErr);
      }
    } else {
      console.warn('Contact API: RESEND_API_KEY not set, email notification skipped');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
