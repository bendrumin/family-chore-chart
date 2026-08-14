import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate a short alphanumeric code (8 chars)
function generateCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Serves both clients, like /api/account/delete:
 *   - web  — Supabase session cookie
 *   - iOS  — `Authorization: Bearer <supabase access token>`
 */
async function resolveUser(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const admin = createServiceRoleClient();
      const { data: tokenAuth } = await admin.auth.getUser(token);
      if (tokenAuth?.user) return tokenAuth.user;
    }
  }

  return null;
}

// GET /api/kid-login-code - Get or create the family's kid login code
export async function GET(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The service-role client reads and writes here: Bearer-authenticated
    // requests have no cookie session, so RLS would block the anon client.
    // Every query is scoped to the resolved user's id.
    let admin;
    try {
      admin = createServiceRoleClient();
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('kid_login_code')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let code = profile?.kid_login_code;

    // Generate code if missing
    if (!code) {
      for (let attempt = 0; attempt < 5; attempt++) {
        code = generateCode();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase service role update type inference
        const { error: updateError } = await (admin as any)
          .from('profiles')
          .update({ kid_login_code: code })
          .eq('id', user.id);

        if (!updateError) break;
        if (attempt === 4) {
          return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
        }
      }
    }

    const host = request.headers.get('host')
    const baseUrl = host
      ? (host.includes('localhost') || host.includes('127.0.0.1') ? `http://${host}` : `https://${host}`)
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://chorestar.app')
    const kidLoginUrl = `${baseUrl}/kid-login/${code}`;

    return NextResponse.json({ code, kidLoginUrl });
  } catch (error) {
    console.error('kid-login-code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
