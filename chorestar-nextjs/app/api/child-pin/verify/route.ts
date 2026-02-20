import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  checkRateLimit,
  recordAttempt,
  resetAttempts,
  getClientIp,
  createRateLimitResponse,
  RATE_LIMITS,
} from '@/lib/utils/rate-limit';

// Hash a PIN using SHA-256 with optional salt
function hashPin(pin: string, salt?: string): string {
  const input = salt ? `${pin}${salt}` : pin;
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Constant-time comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  try {
    if (a.length !== b.length || a.length !== 64) return false;
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// POST /api/child-pin/verify - Verify a child's PIN
export async function POST(request: Request) {
  try {
    // Use service role so PIN verify works without parent login (e.g. kid on own device)
    const supabase = createServiceRoleClient();

    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // Check rate limit (5 attempts per 15 minutes per IP)
    const rateLimitCheck = checkRateLimit(clientIp, RATE_LIMITS.PIN_VERIFY);

    if (!rateLimitCheck.allowed) {
      const retryAfter = rateLimitCheck.retryAfter || 60;
      if (rateLimitCheck.lockedUntil) {
        return createRateLimitResponse(
          retryAfter,
          'Too many failed attempts. Account temporarily locked.'
        );
      }
      return createRateLimitResponse(retryAfter);
    }

    const body = await request.json();
    const pin = String(body.pin ?? '').replace(/\D/g, '');
    const familyCode = (body.familyCode ?? '').trim().toLowerCase();

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    if (!familyCode) {
      return NextResponse.json({ error: 'Family code is required. Use your family kid login URL.' }, { status: 400 });
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      recordAttempt(clientIp, RATE_LIMITS.PIN_VERIFY);
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Resolve family code to user_id (profiles.id = user_id for the family)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('kid_login_code', familyCode)
      .maybeSingle();

    if (profileError || !profile) {
      recordAttempt(clientIp, RATE_LIMITS.PIN_VERIFY);
      return NextResponse.json({ error: 'Invalid family code' }, { status: 400 });
    }

    const userId = (profile as { id: string }).id;

    // Find child PINs ONLY for this family's children (scoped by family code)
    const { data: allPins, error: fetchError } = await supabase
      .from('child_pins')
      .select(`
        child_id,
        pin_hash,
        pin_salt,
        failed_attempts,
        locked_until,
        children!inner (
          id,
          name,
          avatar_color,
          avatar_url,
          avatar_file
        )
      `)
      .eq('children.user_id', userId);

    if (fetchError) {
      recordAttempt(clientIp, RATE_LIMITS.PIN_VERIFY);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Check each PIN with constant-time comparison
    let matchedChild: { id: string; name: string; avatar_color?: string | null; avatar_url?: string | null; avatar_file?: string | null } | null = null;
    let matchedPinRecord: { child_id: string; pin_hash: string; failed_attempts?: number | null; locked_until?: string | null } | null = null;

    for (const pr of allPins || []) {
      const pinRecord = pr as { child_id: string; pin_hash: string; pin_salt?: string | null; failed_attempts?: number | null; locked_until?: string | null; children?: typeof matchedChild };
      const hashedInput = hashPin(pin, pinRecord.pin_salt || undefined);
      if (timingSafeEqual(hashedInput, pinRecord.pin_hash)) {
        matchedChild = pinRecord.children ?? null;
        matchedPinRecord = { child_id: pinRecord.child_id, pin_hash: pinRecord.pin_hash, failed_attempts: pinRecord.failed_attempts, locked_until: pinRecord.locked_until };
        break;
      }
    }

    // No match found - try legacy pgcrypto only when no familyCode (backward compat)
    if ((!matchedChild || !matchedPinRecord) && !familyCode) {
      const { data: legacyMatch } = await (supabase as any).rpc('verify_child_pin', { p_pin: pin });
      const first = Array.isArray(legacyMatch) ? legacyMatch[0] : null;
      if (first?.child_id) {
        const { data: child } = await supabase
          .from('children')
          .select('id, name, avatar_color, avatar_url, avatar_file')
          .eq('id', first.child_id)
          .single();
        if (child) {
          const c = child as { id: string; name: string; avatar_color?: string | null; avatar_url?: string | null; avatar_file?: string | null };
          matchedChild = c;
          matchedPinRecord = { child_id: c.id, pin_hash: '', failed_attempts: 0, locked_until: null };
        }
      }
    }

    if (!matchedChild || !matchedPinRecord) {
      recordAttempt(clientIp, RATE_LIMITS.PIN_VERIFY);
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Check if this specific child's PIN is locked
    if (matchedPinRecord.locked_until) {
      const lockedUntil = new Date(matchedPinRecord.locked_until).getTime();
      const now = Date.now();

      if (lockedUntil > now) {
        const retryAfter = Math.ceil((lockedUntil - now) / 1000);
        return createRateLimitResponse(
          retryAfter,
          'This PIN is temporarily locked due to too many failed attempts.'
        );
      }

      // Lock expired, reset it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('child_pins')
        .update({ failed_attempts: 0, locked_until: null })
        .eq('child_id', matchedPinRecord.child_id);
    }

    // Reset failed attempts for this child
    if ((matchedPinRecord.failed_attempts ?? 0) > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('child_pins')
        .update({ failed_attempts: 0 })
        .eq('child_id', matchedPinRecord.child_id);
    }

    // Success! Reset rate limit attempts for this IP
    resetAttempts(clientIp);

    // Create kid session for routine completion (8 hour expiry) - service role bypasses RLS
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { data: session, error: sessionError } = await (supabase as any)
      .from('kid_sessions')
      .insert({
        child_id: matchedPinRecord.child_id,
        expires_at: expiresAt,
      })
      .select('token')
      .single();

    const kidToken = sessionError ? null : (session as { token?: string } | null)?.token;

    return NextResponse.json({
      success: true,
      child: matchedChild,
      kidToken: kidToken || undefined,
    });
  } catch (error) {
    // Don't expose error details to client
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
