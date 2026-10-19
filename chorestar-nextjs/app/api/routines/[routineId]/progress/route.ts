import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { checkRateLimit, recordAttempt, createRateLimitResponse } from '@/lib/utils/rate-limit'

/**
 * POST /api/routines/[routineId]/progress — the routine player reports which
 * step a kid is on, for the parent dashboard's live view (migration 032).
 *
 * Body: { childId, stepIndex, stepsTotal, stepTitle? } while running, or
 * { childId, clear: true } when the kid exits. Finishing clears it in
 * /complete. The player throttles to one write every few seconds; the rate
 * limit here is only a backstop.
 *
 * Auth: the kid's session token, or a signed-in parent of the family (kid
 * mode on the parent's device). Best-effort by design: the player ignores
 * failures, and this never blocks a routine.
 */
const BodySchema = z.union([
  z.object({
    childId: z.string().uuid(),
    clear: z.literal(true),
  }),
  z.object({
    childId: z.string().uuid(),
    stepIndex: z.number().int().min(0).max(199),
    stepsTotal: z.number().int().min(1).max(200),
    stepTitle: z.string().max(200).nullable().optional(),
  }),
])

const PROGRESS_LIMIT = { interval: 10 * 60 * 1000, maxAttempts: 150 }

export async function POST(request: Request, { params }: { params: Promise<{ routineId: string }> }) {
  const { routineId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(routineId)) {
    return NextResponse.json({ error: 'Routine not found' }, { status: 404 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data

  try {
    const admin = createServiceRoleClient()

    const { data: routine } = await admin
      .from('routines')
      .select('id, child_id, children!inner(user_id)')
      .eq('id', routineId)
      .eq('child_id', body.childId)
      .maybeSingle()
    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 })
    }
    const ownerId = (routine.children as unknown as { user_id: string }).user_id

    const kid = await validateKidToken(request, body.childId)
    let authorized = !!kid
    if (!authorized) {
      const parentId = await getParentUserId(request)
      if (parentId) authorized = (await familiesForUser(parentId)).includes(ownerId)
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const key = `routine-progress:${routineId}`
    const rate = await checkRateLimit(key, PROGRESS_LIMIT)
    if (!rate.allowed) return createRateLimitResponse(rate.retryAfter || 60)
    await recordAttempt(key, PROGRESS_LIMIT)

    if ('clear' in body) {
      await admin.from('routine_progress').delete().eq('routine_id', routineId)
      return NextResponse.json({ success: true })
    }

    const stepIndex = Math.min(body.stepIndex, body.stepsTotal - 1)
    const now = new Date().toISOString()
    const { error } = await admin.from('routine_progress').upsert(
      {
        routine_id: routineId,
        child_id: body.childId,
        current_step_index: stepIndex,
        steps_total: body.stepsTotal,
        current_step_title: body.stepTitle?.trim().slice(0, 200) || null,
        updated_at: now,
        // A fresh run (first step) restarts the clock; later steps keep it.
        ...(stepIndex === 0 ? { started_at: now } : {}),
      },
      { onConflict: 'routine_id' }
    )
    if (error) {
      // Most likely migration 032 isn't applied yet. Never the kid's problem.
      return NextResponse.json({ success: false }, { status: 202 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[routines/progress] Unexpected error:', error)
    return NextResponse.json({ success: false }, { status: 202 })
  }
}
