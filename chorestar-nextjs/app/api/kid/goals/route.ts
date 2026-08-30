import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveKidRequest } from '@/lib/utils/kid-or-parent-auth'
import { activeGoal, computeBalance, goalView, walletLimits } from '@/lib/utils/wallet'
import { GOAL_MAX_CENTS } from '@/lib/constants/rewards'

/**
 * Goals, from the kid's side (and from kid mode on a parent's device).
 *
 * POST  /api/kid/goals  { childId?, title, emoji?, targetCents }
 *   Creates the active goal. Ownership is the point: a kid picks their own
 *   thing. Free plan: one active goal at a time (a parent creating one is held
 *   to the same limit here; the Settings tab can archive the old one first).
 *
 * PATCH /api/kid/goals  { childId?, goalId, title?, emoji?, targetCents?, action?: 'archive' }
 *   Edits or archives the goal. A reached goal is history and cannot be edited.
 */
const createSchema = z.object({
  childId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(60),
  emoji: z.string().trim().max(8).optional().nullable(),
  targetCents: z.number().int().min(100).max(GOAL_MAX_CENTS),
})

const patchSchema = z.object({
  childId: z.string().uuid().optional(),
  goalId: z.string().uuid(),
  title: z.string().trim().min(1).max(60).optional(),
  emoji: z.string().trim().max(8).optional().nullable(),
  targetCents: z.number().int().min(100).max(GOAL_MAX_CENTS).optional(),
  action: z.enum(['archive']).optional(),
})

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const ctx = await resolveKidRequest(request, parsed.data.childId ?? null)
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const admin = createServiceRoleClient()
    const [existing, limits] = await Promise.all([activeGoal(ctx.child.id), walletLimits(ctx.child.user_id)])
    if (existing && limits.goalLimit <= 1) {
      return NextResponse.json(
        { error: 'goal_limit', message: 'One goal at a time on the free plan. Reach it or archive it first.' },
        { status: 409 }
      )
    }
    if (limits.goalLimit > 1) {
      const { count } = await admin
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', ctx.child.id)
        .eq('status', 'active')
      if ((count ?? 0) >= limits.goalLimit) {
        return NextResponse.json({ error: 'goal_limit' }, { status: 409 })
      }
    }

    const { data, error } = await admin
      .from('goals')
      .insert({
        child_id: ctx.child.id,
        title: parsed.data.title,
        emoji: parsed.data.emoji ?? null,
        target_cents: parsed.data.targetCents,
        created_by: ctx.actor,
      })
      .select('*')
      .maybeSingle()
    if (error || !data) {
      console.error('[kid/goals] insert failed:', error?.message)
      return NextResponse.json({ error: 'Could not save the goal' }, { status: 500 })
    }

    const balance = await computeBalance(ctx.child)
    return NextResponse.json({ goal: goalView(data, balance.owedCents) })
  } catch (error) {
    console.error('[kid/goals] POST', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const raw = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const ctx = await resolveKidRequest(request, parsed.data.childId ?? null)
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const admin = createServiceRoleClient()
    const { data: goal } = await admin
      .from('goals')
      .select('id, status')
      .eq('id', parsed.data.goalId)
      .eq('child_id', ctx.child.id)
      .maybeSingle()
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    if (goal.status === 'reached') {
      return NextResponse.json({ error: 'A reached goal is history and cannot be changed' }, { status: 409 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.action === 'archive') update.status = 'archived'
    if (parsed.data.title !== undefined) update.title = parsed.data.title
    if (parsed.data.emoji !== undefined) update.emoji = parsed.data.emoji
    if (parsed.data.targetCents !== undefined) {
      update.target_cents = parsed.data.targetCents
      // A new target means the "reached" alert may need to fire again.
      update.notified_at = null
    }

    const { data, error } = await admin.from('goals').update(update).eq('id', goal.id).select('*').maybeSingle()
    if (error || !data) {
      console.error('[kid/goals] update failed:', error?.message)
      return NextResponse.json({ error: 'Could not save the goal' }, { status: 500 })
    }
    const balance = await computeBalance(ctx.child)
    return NextResponse.json({ goal: goalView(data, balance.owedCents) })
  } catch (error) {
    console.error('[kid/goals] PATCH', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
