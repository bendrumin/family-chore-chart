/* eslint-disable @typescript-eslint/no-explicit-any -- family_challenges (031) is newer than the generated types */
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { familyIsPremium } from '@/lib/utils/wallet'
import { createChallengeSchema, challengeInsertRow } from '@/lib/challenges/schema'
import { CHALLENGE_COLUMNS } from '@/lib/challenges/data'

/**
 * POST /api/challenges  (Premium)
 *   { title, emoji?, rewardText, rewardCents?, metric: 'chores' | 'routines',
 *     mode: 'team' | 'each', target, choreFilter?: 'any' | 'bonus',
 *     routineType?: 'morning' | 'bedtime' | 'afterschool' | 'custom' | null,
 *     childIds (2+), startsOn, endsOn (YYYY-MM-DD, family timezone) }
 *
 * Creates a family challenge (migration 031). Premium is checked here for
 * every caller (web session or a native app's Bearer token); app sessions
 * writing straight to the table are held by 031's trigger too. Reads, edits
 * and cancelling go through the RLS client; delivering the reward goes
 * through /api/challenges/[id]/deliver, which credits the money.
 */
export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createChallengeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', message: parsed.error.issues[0]?.message ?? 'Invalid body' },
      { status: 400 }
    )
  }
  const body = parsed.data

  const admin = createServiceRoleClient() as any
  const { effectiveUserId: ownerId } = await getEffectiveFamilyId(admin, userId)
  if (!(await familyIsPremium(ownerId))) {
    return NextResponse.json(
      { error: 'premium_required', message: 'Family challenges are part of Premium.' },
      { status: 403 }
    )
  }

  const unique = [...new Set(body.childIds)]
  const { data: kids } = await admin.from('children').select('id').eq('user_id', ownerId).in('id', unique)
  if ((kids ?? []).length !== unique.length) {
    return NextResponse.json({ error: 'Those kids are not all in your family' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('family_challenges')
    .insert(challengeInsertRow(body, ownerId, userId))
    .select(CHALLENGE_COLUMNS)
    .single()
  if (error) {
    console.error('[challenges] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save the challenge' }, { status: 500 })
  }
  return NextResponse.json({ challenge: data })
}
