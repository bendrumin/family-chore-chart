import { createClient } from '@/lib/supabase/server';
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
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return crypto.timingSafeEqual(bufA, bufB);
}

// POST /api/child-pin/verify - Verify a child's PIN
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

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
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      recordAttempt(clientIp, RATE_LIMITS.PIN_VERIFY);
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Find ALL child PINs and check each one with constant-time comparison
    // This prevents timing attacks that could reveal which PINs exist
    const { data: allPins, error: fetchError } = await supabase
      .from('child_pins')
      .select(`
        child_id,
        pin_hash,
        pin_salt,
        failed_attempts,
        locked_until,
        children (
          id,
          name,
          avatar_color,
          avatar_url,
          avatar_file
        )
      `);

    if (fetchError) {
      recordAttempt(clientIp, RATE_LIMITS.PIN_VERIFY);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Check each PIN with constant-time comparison
    let matchedChild = null;
    let matchedPinRecord = null;

    for (const pinRecord of allPins || []) {
      const hashedInput = hashPin(pin, pinRecord.pin_salt || undefined);
      if (timingSafeEqual(hashedInput, pinRecord.pin_hash)) {
        matchedChild = pinRecord.children;
        matchedPinRecord = pinRecord;
        break;
      }
    }

    // No match found
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
      await supabase
        .from('child_pins')
        .update({ failed_attempts: 0, locked_until: null })
        .eq('child_id', matchedPinRecord.child_id);
    }

    // Success! Reset rate limit attempts for this IP
    resetAttempts(clientIp);

    // Reset failed attempts for this child
    if (matchedPinRecord.failed_attempts > 0) {
      await supabase
        .from('child_pins')
        .update({ failed_attempts: 0 })
        .eq('child_id', matchedPinRecord.child_id);
    }

    return NextResponse.json({
      success: true,
      child: matchedChild,
    });
  } catch (error) {
    // Don't expose error details to client
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
