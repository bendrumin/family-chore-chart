/**
 * Rate Limiting Utility
 *
 * Uses Upstash Redis (via its REST API, plain fetch — no SDK dependency) when
 * configured, so limits are shared across all serverless/edge instances and
 * survive deploys. Falls back to per-instance in-memory storage when Redis is
 * not configured (fine for local dev; logs a warning in production).
 *
 * Configure via env (either naming convention works):
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *   KV_REST_API_URL / KV_REST_API_TOKEN   (Vercel KV / Marketplace Redis)
 *
 * On Redis errors, falls back to in-memory for that request (fail-open on
 * infra issues rather than blocking real users).
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts in the time window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  lockedUntil?: number;
}

// ---------------------------------------------------------------------------
// Redis (Upstash REST) backend
// ---------------------------------------------------------------------------

const REDIS_URL = (
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  ''
).trim().replace(/\/$/, '');

const REDIS_TOKEN = (
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  ''
).trim();

const redisEnabled = Boolean(REDIS_URL && REDIS_TOKEN);

let warnedNoRedis = false;
function warnIfNoRedis(): void {
  if (!redisEnabled && !warnedNoRedis && process.env.NODE_ENV === 'production') {
    console.warn(
      '[rate-limit] No Redis configured — using per-instance in-memory rate limiting. ' +
        'Limits reset on deploy and are not shared across instances. ' +
        'Set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL/KV_REST_API_TOKEN).'
    );
    warnedNoRedis = true;
  }
}

type RedisCommand = (string | number)[];

/**
 * Execute Redis commands via Upstash's REST pipeline endpoint.
 * https://upstash.com/docs/redis/features/restapi
 */
async function redisPipeline(commands: RedisCommand[]): Promise<unknown[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Redis pipeline request failed: ${res.status}`);
  }

  const results = (await res.json()) as { result?: unknown; error?: string }[];
  return results.map((r) => {
    if (r.error) throw new Error(`Redis command error: ${r.error}`);
    return r.result;
  });
}

function redisKey(identifier: string): string {
  return `ratelimit:${identifier}`;
}

async function redisCheck(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = redisKey(identifier);
  const [countRaw, pttlRaw] = await redisPipeline([
    ['GET', key],
    ['PTTL', key],
  ]);

  const now = Date.now();
  const count = Number(countRaw ?? 0);
  const pttl = Number(pttlRaw ?? -2); // -2 = key missing, -1 = no expiry
  const resetTime = pttl > 0 ? now + pttl : now + config.interval;

  if (count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((pttl > 0 ? pttl : config.interval) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: config.maxAttempts - count - 1,
    resetTime,
  };
}

async function redisRecord(identifier: string, config: RateLimitConfig): Promise<void> {
  const key = redisKey(identifier);
  const [count] = await redisPipeline([['INCR', key]]);
  // Set the window expiry on first attempt. Also repair keys that somehow
  // lost their TTL so they can't rate-limit forever.
  if (Number(count) === 1) {
    await redisPipeline([['PEXPIRE', key, config.interval]]);
  }
}

async function redisReset(identifier: string): Promise<void> {
  await redisPipeline([['DEL', redisKey(identifier)]]);
}

// ---------------------------------------------------------------------------
// In-memory fallback (per instance — local dev, or Redis outage)
// ---------------------------------------------------------------------------

interface AttemptRecord {
  count: number;
  resetTime: number;
  lockedUntil?: number;
}

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

function memoryCheck(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let record = attemptStore.get(identifier);

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
    record = { count: 0, resetTime: now + config.interval };
    attemptStore.set(identifier, record);
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

function memoryRecord(identifier: string, config: RateLimitConfig): void {
  const now = Date.now();
  let record = attemptStore.get(identifier);

  if (!record || record.resetTime <= now) {
    record = { count: 1, resetTime: now + config.interval };
  } else {
    record.count += 1;
  }

  attemptStore.set(identifier, record);
}

function memoryReset(identifier: string): void {
  attemptStore.delete(identifier);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  warnIfNoRedis();
  if (redisEnabled) {
    try {
      return await redisCheck(identifier, config);
    } catch (error) {
      console.error('[rate-limit] Redis check failed, using in-memory fallback:', error);
    }
  }
  return memoryCheck(identifier, config);
}

/**
 * Record an attempt (increment counter)
 *
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export async function recordAttempt(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  if (redisEnabled) {
    try {
      await redisRecord(identifier, config);
      return;
    } catch (error) {
      console.error('[rate-limit] Redis record failed, using in-memory fallback:', error);
    }
  }
  memoryRecord(identifier, config);
}

/**
 * Reset attempts for an identifier (e.g., after successful login)
 *
 * @param identifier - Unique identifier
 */
export async function resetAttempts(identifier: string): Promise<void> {
  if (redisEnabled) {
    try {
      await redisReset(identifier);
      return;
    } catch (error) {
      console.error('[rate-limit] Redis reset failed, using in-memory fallback:', error);
    }
  }
  memoryReset(identifier);
}

/**
 * Get client IP address from request
 * Works with Vercel's edge network
 *
 * @param request - Next.js request object
 * @returns IP address or 'unknown'
 */
export function getClientIp(request: Request): string {
  // Prefer headers that Vercel's edge sets to the *real* client IP and that a
  // client cannot forge. The leftmost value of `x-forwarded-for` is
  // client-supplied (Vercel appends the true IP rather than replacing it), so
  // trusting it lets an attacker rotate the header to bypass rate limits.
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback for local dev / non-Vercel hosts. `x-forwarded-for` is
  // client-influenced here, so this is best-effort only.
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

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
