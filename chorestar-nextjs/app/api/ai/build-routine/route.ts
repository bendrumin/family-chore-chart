import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { familiesForUser } from '@/lib/utils/approval'
import { isFamilyPremium } from '@/lib/routines/server'
import {
  checkRateLimit,
  recordAttempt,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/utils/rate-limit'
import { buildRoutineWithAI, buildRoutineFromTemplates, AIRoutineError } from '@/lib/ai/build-routine'

/**
 * POST /api/ai/build-routine — "Build with AI" in the routine builder (Premium).
 *
 * Body: { goal, childId?, routineType? }. The child's name and age come from
 * the database when childId is given (so the prompt never trusts a typed age).
 *
 * Returns { draft, source: 'ai' | 'templates' }. When the AI is unavailable
 * (no key, upstream error, unusable output) the answer is a rule-based draft
 * from the routine templates instead of an error: the parent always gets
 * steps to edit. Nothing is saved here.
 *
 * Auth: signed-in parent (web cookie or iOS/Android Bearer token) whose family
 * is Premium; 403 premium_required otherwise. Per-user rate limit caps spend.
 */
const RequestSchema = z.object({
  goal: z.string().trim().min(3).max(500),
  childId: z.string().uuid().optional(),
  routineType: z.enum(['morning', 'bedtime', 'afterschool', 'custom']).nullable().optional(),
})

export async function POST(request: Request) {
  try {
    const userId = await getParentUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Describe the routine in a few words (3-500 characters).' }, { status: 400 })
    }
    const { goal, childId, routineType } = parsed.data

    const admin = createServiceRoleClient()

    // The family's plan is the owner's; a co-parent inherits it.
    const { effectiveUserId: ownerId } = await getEffectiveFamilyId(admin as any, userId)
    if (!(await isFamilyPremium(ownerId, admin))) {
      return NextResponse.json({ error: 'premium_required' }, { status: 403 })
    }

    let childName: string | null = null
    let childAge: number | null = null
    if (childId) {
      const { data: child } = await admin.from('children').select('name, age, user_id').eq('id', childId).maybeSingle()
      if (!child || !(await familiesForUser(userId)).includes(child.user_id)) {
        return NextResponse.json({ error: 'Child not found' }, { status: 404 })
      }
      childName = child.name
      childAge = child.age ?? null
    }

    const key = `ai-routine:${userId}`
    const rate = await checkRateLimit(key, RATE_LIMITS.AI_ROUTINE_BUILDER)
    if (!rate.allowed) {
      return createRateLimitResponse(rate.retryAfter || 60, 'Too many AI routine requests. Please wait a moment and try again.')
    }
    await recordAttempt(key, RATE_LIMITS.AI_ROUTINE_BUILDER)

    const req = { goal, childName, childAge, routineType: routineType ?? null }
    try {
      const draft = await buildRoutineWithAI(req)
      return NextResponse.json({ draft, source: 'ai' })
    } catch (error) {
      if (!(error instanceof AIRoutineError)) throw error
      // The feature degrades, it doesn't break.
      console.warn('AI routine builder unavailable, using templates:', error.message)
      return NextResponse.json({ draft: buildRoutineFromTemplates(req), source: 'templates' })
    }
  } catch (error) {
    console.error('AI routine builder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
