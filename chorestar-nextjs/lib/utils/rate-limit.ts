/**
 * Rate Limiting Utility
 *
 * Edge-compatible rate limiting using in-memory storage.
 * For production with multiple edge nodes, consider upgrading to:
 * - Vercel KV (Redis)
 * - Upstash Redis
 * - Vercel Edge Config
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts in the time window
}

interface AttemptRecord {
  count: number;
  resetTime: number;
  lockedUntil?: number;
}

// In-memory storage (per edge instance)
// Note: This resets on deployment and is per-edge-node
const attemptStore = new Map<string, AttemptRecord>();

// Cleanup old entries periodically (prevent memory bloat)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptStore.entries()) {
    if (record.resetTime < now && (!record.lockedUntil || record.lockedUntil < now)) {
      attemptStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  PIN_VERIFY: { interval: 15 * 60 * 1000, maxAttempts: 5 }, // 5 attempts per 15 minutes
  AUTH_LOGIN: { interval: 15 * 60 * 1000, maxAttempts: 5 }, // 5 attempts per 15 minutes
  AUTH_SIGNUP: { interval: 60 * 60 * 1000, maxAttempts: 3 }, // 3 signups per hour
  PASSWORD_RESET: { interval: 60 * 60 * 1000, maxAttempts: 3 }, // 3 attempts per hour
  EMAIL_RESEND: { interval: 60 * 60 * 1000, maxAttempts: 3 }, // 3 per hour
  CONTACT_FORM: { interval: 60 * 60 * 1000, maxAttempts: 3 }, // 3 per hour
} as const;

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, email, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and retry information
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  lockedUntil?: number;
} {
  const now = Date.now();
  const key = identifier;

  let record = attemptStore.get(key);

  // Check if locked out
  if (record?.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.lockedUntil - now) / 1000),
      lockedUntil: record.lockedUntil,
    };
  }

  // Reset if window expired
  if (!record || record.resetTime <= now) {
    record = {
      count: 0,
      resetTime: now + config.interval,
    };
    attemptStore.set(key, record);
  }

  // Check if at limit
  if (record.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - record.count - 1,
    resetTime: record.resetTime,
  };
}

/**
 * Record an attempt (increment counter)
 *
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export function recordAttempt(identifier: string, config: RateLimitConfig): void {
  const now = Date.now();
  const key = identifier;

  let record = attemptStore.get(key);

  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: now + config.interval,
    };
  } else {
    record.count += 1;
  }

  attemptStore.set(key, record);
}

/**
 * Lock an identifier for a specified duration (e.g., after too many failed attempts)
 *
 * @param identifier - Unique identifier
 * @param durationMs - Lock duration in milliseconds
 */
export function lockIdentifier(identifier: string, durationMs: number): void {
  const now = Date.now();
  const key = identifier;

  let record = attemptStore.get(key);

  if (!record) {
    record = {
      count: 0,
      resetTime: now + durationMs,
      lockedUntil: now + durationMs,
    };
  } else {
    record.lockedUntil = now + durationMs;
  }

  attemptStore.set(key, record);
}

/**
 * Reset attempts for an identifier (e.g., after successful login)
 *
 * @param identifier - Unique identifier
 */
export function resetAttempts(identifier: string): void {
  attemptStore.delete(identifier);
}

/**
 * Get client IP address from request
 * Works with Vercel's edge network
 *
 * @param request - Next.js request object
 * @returns IP address or 'unknown'
 */
export function getClientIp(request: Request): string {
  // Check Vercel-specific headers first
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list; take the first IP
    return forwardedFor.split(',')[0].trim();
  }

  // Check other common headers
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * Create a rate limit response with appropriate headers
 *
 * @param retryAfter - Seconds until retry is allowed
 * @param message - Error message
 * @returns NextResponse with 429 status
 */
export function createRateLimitResponse(retryAfter: number, message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message || 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}
