import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import {
  checkRateLimit,
  recordAttempt,
  RATE_LIMITS,
  getClientIp,
  createRateLimitResponse,
} from '@/lib/utils/rate-limit'

/**
 * Permanent account deletion — App Store Guideline 5.1.1(v).
 *
 * Apple requires any app that lets you create an account to let you delete it
 * from inside the app, and is explicit that "only offering to temporarily
 * deactivate or disable an account is insufficient". So this really deletes:
 * there is no soft-delete flag, no restore window.
 *
 * Serves both clients:
 *   - web  — Supabase session cookie
 *   - iOS  — `Authorization: Bearer <supabase access token>`
 *
 * Almost all of the user's data disappears through one call to
 * auth.admin.deleteUser(). Every table hangs off auth.users with ON DELETE
 * CASCADE (profiles → children → chores → chore_completions, plus routines,
 * routine_steps, routine_completions, child_pins, kid_sessions,
 * achievement_badges, family_settings, family_members, family_codes,
 * push_subscriptions). The exceptions are handled explicitly below.
 */

/** The word the client must send back. Compared case-insensitively so a mobile
 *  keyboard that auto-capitalizes doesn't lock someone out of their own request. */
const CONFIRM_WORD = 'DELETE'

/** Marketing/waitlist tables keyed by email rather than user_id — no FK, so no
 *  cascade. They aren't in the generated Supabase types, hence the cast. */
const EMAIL_KEYED_TABLES = ['testflight_waitlist', 'outreach_sent_log'] as const

/**
 * Resolve the caller from either auth style.
 *
 * Returns the cookie-backed client too (when that's how they authenticated) so
 * the caller can clear the browser session afterwards.
 */
async function resolveUser(request: Request): Promise<{
  user: { id: string; email?: string } | null
  cookieClient: Awaited<ReturnType<typeof createClient>> | null
}> {
  // Web: session cookie.
  const cookieClient = await createClient()
  const { data: cookieAuth } = await cookieClient.auth.getUser()
  if (cookieAuth?.user) {
    return { user: cookieAuth.user, cookieClient }
  }

  // iOS: bearer access token. getUser(jwt) validates it against Supabase's
  // /auth/v1/user rather than trusting anything we decode locally.
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const admin = createServiceRoleClient()
      const { data: tokenAuth } = await admin.auth.getUser(token)
      if (tokenAuth?.user) {
        return { user: tokenAuth.user, cookieClient: null }
      }
    }
  }

  return { user: null, cookieClient: null }
}

/**
 * Cancel any live Stripe subscription for this email.
 *
 * There is no stripe_customer_id column anywhere in the schema — the checkout
 * webhook maps payments back via session metadata — so the customer has to be
 * looked up by email.
 *
 * Best-effort by design: a Stripe outage must not be able to block a deletion
 * Apple requires to work. Failures are logged with the email so billing can be
 * cleaned up by hand, and reported back to the client.
 */
async function cancelStripeSubscriptions(email: string): Promise<{ cancelled: number; failed: boolean }> {
  if (!process.env.STRIPE_SECRET_KEY) return { cancelled: 0, failed: false }

  try {
    const stripe = getStripe()
    const customers = await stripe.customers.list({ email, limit: 10 })

    let cancelled = 0
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 100,
      })

      for (const subscription of subscriptions.data) {
        // Already over — nothing to cancel.
        if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
          continue
        }
        // Cancel now, not at period end: the account is going away, so leaving
        // it billable until the next renewal would charge a deleted user.
        await stripe.subscriptions.cancel(subscription.id)
        cancelled++
      }
    }

    return { cancelled, failed: false }
  } catch (error) {
    console.error(`[account/delete] Stripe cleanup failed for ${email}:`, error)
    return { cancelled: 0, failed: true }
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateCheck = await checkRateLimit(`account-delete:${ip}`, RATE_LIMITS.ACCOUNT_DELETE)
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.retryAfter || 60, 'Too many attempts. Please try again later.')
    }

    const { user, cookieClient } = await resolveUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to delete your account.' }, { status: 401 })
    }

    // Only count attempts from authenticated callers, so an unauthenticated
    // prober can't burn a real user's budget by sharing their IP.
    await recordAttempt(`account-delete:${ip}`, RATE_LIMITS.ACCOUNT_DELETE)

    let body: unknown = null
    try {
      body = await request.json()
    } catch {
      // fall through to the confirmation check
    }
    const confirm = String((body as { confirm?: unknown } | null)?.confirm ?? '').trim()

    // Apple explicitly allows confirmation steps to prevent accidents. Requiring
    // the typed word is also the last barrier before something irreversible.
    if (confirm.toUpperCase() !== CONFIRM_WORD) {
      return NextResponse.json(
        { error: `Type ${CONFIRM_WORD} to confirm account deletion.` },
        { status: 400 }
      )
    }

    const admin = createServiceRoleClient()

    // Prefer the profile's email, falling back to the auth record. Used for the
    // email-keyed cleanup below, so read it before the row is gone.
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle()
    const email = (profile as { email?: string } | null)?.email || user.email || null

    const stripeResult = email ? await cancelStripeSubscriptions(email) : { cancelled: 0, failed: false }

    if (email) {
      for (const table of EMAIL_KEYED_TABLES) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin as any).from(table).delete().eq('email', email)
        } catch (error) {
          // The table may not exist in every environment; never block deletion.
          console.error(`[account/delete] Failed to clear ${table}:`, error)
        }
      }
    }

    // NOTE: contact_submissions is deliberately left alone. Its user_id FK is
    // ON DELETE SET NULL, which detaches the ticket from the deleted account
    // while preserving support correspondence — including any thread that's
    // still open. It is not part of the account.

    // The cascade. Everything above is cleanup that a foreign key can't reach.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error(`[account/delete] deleteUser failed for ${user.id}:`, deleteError)
      return NextResponse.json(
        { error: 'We could not delete your account. Please contact hi@chorestar.app and we will remove it for you.' },
        { status: 500 }
      )
    }

    // Clear the browser session. The refresh token is already dead server-side;
    // this drops the cookies so the client doesn't briefly look signed in.
    if (cookieClient) {
      try {
        await cookieClient.auth.signOut()
      } catch {
        // Expected to fail sometimes — the user it belonged to no longer exists.
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionsCancelled: stripeResult.cancelled,
      // Surfaced so the client can tell someone to check their billing rather
      // than silently leaving a live subscription behind.
      billingCleanupFailed: stripeResult.failed,
    })
  } catch (error) {
    console.error('[account/delete] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
