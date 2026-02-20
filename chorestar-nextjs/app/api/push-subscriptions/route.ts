import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/push-subscriptions - Save push subscription for a logged-in user
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, keys.p256dh, keys.auth' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || null;

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent,
      },
      {
        onConflict: 'endpoint',
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error('Failed to save push subscription:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
