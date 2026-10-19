/* eslint-disable @typescript-eslint/no-explicit-any -- migration 031 tables are newer than the generated types */
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { loadChallengeWithProgress } from '@/lib/challenges/server'
import { rewardCredits } from '@/lib/challenges/progress'

/**
 * POST /api/challenges/[challengeId]/deliver
 *
 * The parent handed over the reward. Progress is recomputed here from the
 * completions (never trusted from the client); the target must be met. If the
 * challenge carries a money reward, each participating kid gets one
 * family_challenge_rewards row (031), which computeBalance adds to what they
 * have earned, so it shows up in every wallet, goal bar and payout like chore
 * money does. The unique (challenge_id, child_id) index makes a double tap
 * credit once.
 *
 * Not gated on Premium: a family that lapsed can still close out a challenge
 * it already started.
 */
export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  try {
    const loaded = await loadChallengeWithProgress(challengeId)
    if (!loaded) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    const { challenge, progress } = loaded

    const families = await familiesForUser(userId)
    if (!families.includes(challenge.user_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (challenge.status === 'delivered') {
      return NextResponse.json({ error: 'already_delivered', message: 'This reward was already delivered.' }, { status: 409 })
    }
    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }
    if (!progress.met) {
      return NextResponse.json(
        { error: 'not_met', message: 'The team has not reached the target yet.', progress },
        { status: 409 }
      )
    }

    const admin = createServiceRoleClient() as any

    // Credit only kids still in the family (a deleted child has no wallet).
    const credits = rewardCredits(challenge, true)
    let credited: Array<{ child_id: string; amount_cents: number }> = []
    if (credits.length > 0) {
      const { data: kids } = await admin
        .from('children')
        .select('id')
        .eq('user_id', challenge.user_id)
        .in('id', credits.map(c => c.child_id))
      const present = new Set(((kids ?? []) as Array<{ id: string }>).map(k => k.id))
      const rows = credits.filter(c => present.has(c.child_id)).map(c => ({ ...c, created_by: userId }))
      if (rows.length > 0) {
        const { error } = await admin
          .from('family_challenge_rewards')
          .upsert(rows, { onConflict: 'challenge_id,child_id', ignoreDuplicates: true })
        if (error) {
          console.error('[challenges/deliver] credit insert failed:', error.message)
          return NextResponse.json({ error: 'Could not credit the reward' }, { status: 500 })
        }
        credited = rows.map(r => ({ child_id: r.child_id, amount_cents: r.amount_cents }))
      }
    }

    const now = new Date().toISOString()
    const { error: updateError } = await admin
      .from('family_challenges')
      .update({ status: 'delivered', delivered_at: now, delivered_by: userId, updated_at: now })
      .eq('id', challenge.id)
      .eq('status', 'active')
    if (updateError) {
      console.error('[challenges/deliver] status update failed:', updateError.message)
      return NextResponse.json({ error: 'Could not mark the reward delivered' }, { status: 500 })
    }

    return NextResponse.json({ challengeId: challenge.id, status: 'delivered', deliveredAt: now, credited })
  } catch (error) {
    console.error('[challenges/deliver] failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
