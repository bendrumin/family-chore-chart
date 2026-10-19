import { timingSafeEqual } from 'node:crypto'

/**
 * Vercel Cron calls carry `Authorization: Bearer ${CRON_SECRET}`. Anything
 * else is refused, and so is every call when the secret isn't configured:
 * the jobs write to every family and must never be open to the internet.
 */
export function isCronAuthorized(authorization: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || !authorization) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(authorization)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
