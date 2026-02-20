import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/contact - Submit contact form (works for both logged-in and anonymous users)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

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
    const { error } = await admin.from('contact_submissions').insert({
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 200),
      subject: String(subject).slice(0, 100),
      message: String(message).slice(0, 5000),
      user_id: userId,
      family_name: familyName,
      user_agent: request.headers.get('user-agent') || null,
      url: request.headers.get('referer') || null,
    } as any);

    if (error) {
      console.error('Contact form error:', error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
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
