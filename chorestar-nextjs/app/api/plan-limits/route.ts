/* eslint-disable @typescript-eslint/no-explicit-any -- paused_by_plan and apple_notifications.expires_at (038) are newer than the generated types */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { isPremium } from '@/lib/utils/subscription'
import { chooseActive, familyLimits } from '@/lib/billing/plan-limits'

/**
 * The free limits after a subscription ends (lib/billing/plan-limits.ts).
 * Owner or co-parent, web session or a native app's Bearer token.
 *
 * GET  /api/plan-limits
 *   { premium, ending: { endsAt } | null, limits, pausedKids, pausedChores,
 *     kids: [{ id, name, paused, chores: [{ id, name, on }] }], wouldPause }
 *   `ending` is set while a paid-up family has renewal switched off: the
 *   dashboards warn what `wouldPause` lists before it happens.
 *
 * POST /api/plan-limits  { kids: string[], chores: string[] }
 *   A free family picks what stays on (up to 3 kids, 20 chores).
 */

const chooseSchema = z.object({ kids: z.array(z.string().uuid()).max(50), chores: z.array(z.string().uuid()).max(500) })

async function context(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return null
  const admin = createServiceRoleClient() as any
  const { effectiveUserId } = await getEffectiveFamilyId(admin, userId)
  const { data: profile } = await admin.from('profiles').select('subscription_type').eq('id', effectiveUserId).maybeSingle()
  return { admin, ownerId: effectiveUserId as string, premium: isPremium(profile?.subscription_type) }
}

/** Apple's latest word on renewal: switched off, not back on, and not over yet. */
async function endingAt(admin: any, ownerId: string): Promise<string | null> {
  const { data } = await admin
    .from('apple_notifications')
    .select('notification_type, subtype, expires_at, created_at')
    .eq('user_id', ownerId)
    .eq('environment', 'Production')
    .in('notification_type', ['DID_CHANGE_RENEWAL_STATUS', 'DID_RENEW', 'SUBSCRIBED'])
    .order('created_at', { ascending: false })
    .limit(1)
  const last = data?.[0]
  if (!last || last.subtype !== 'AUTO_RENEW_DISABLED') return null
  if (last.expires_at && Date.parse(last.expires_at) < Date.now()) return null
  return last.expires_at ?? 'unknown'
}

export async function GET(request: Request) {
  const ctx = await context(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [limits, ending] = await Promise.all([
      familyLimits(ctx.admin, ctx.ownerId),
      ctx.premium ? endingAt(ctx.admin, ctx.ownerId) : Promise.resolve(null),
    ])
    return NextResponse.json(
      { premium: ctx.premium, ending: ending ? { endsAt: ending === 'unknown' ? null : ending } : null, ...limits },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[plan-limits] GET', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ctx = await context(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.premium) return NextResponse.json({ error: 'Premium families have no limits' }, { status: 409 })
  const parsed = chooseSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const result = await chooseActive(ctx.admin, ctx.ownerId, parsed.data.kids, parsed.data.chores)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(await familyLimits(ctx.admin, ctx.ownerId))
}
