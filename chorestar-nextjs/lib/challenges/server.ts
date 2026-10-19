import 'server-only'
/* eslint-disable @typescript-eslint/no-explicit-any -- migration 031 tables are newer than the generated types */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CHALLENGE_COLUMNS, loadChallengeInputs, withProgress, type ChallengeWithProgress } from './data'
import type { ChallengeRow } from './progress'

/**
 * Server-side challenge reads (service role). Callers authorize first: the
 * kid API through the kid session, the deliver route through the parent's
 * family membership.
 */

/**
 * Money a kid was credited by delivered family challenges (031's ledger).
 * computeBalance adds it to everything earned. 0 when the migration hasn't
 * run, so the wallet never breaks on an older database.
 */
export async function challengeRewardCents(childId: string): Promise<number> {
  try {
    const admin = createServiceRoleClient() as any
    const { data, error } = await admin.from('family_challenge_rewards').select('amount_cents').eq('child_id', childId)
    if (error) return 0
    return ((data ?? []) as Array<{ amount_cents: number | null }>).reduce((s, r) => s + (r.amount_cents ?? 0), 0)
  } catch {
    return 0
  }
}

export async function familyTimezone(ownerId: string): Promise<string | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin.from('family_settings').select('timezone').eq('user_id', ownerId).maybeSingle()
  return data?.timezone ?? null
}

/** One challenge with progress computed from the database right now. */
export async function loadChallengeWithProgress(challengeId: string): Promise<ChallengeWithProgress | null> {
  const admin = createServiceRoleClient() as any
  const { data, error } = await admin.from('family_challenges').select(CHALLENGE_COLUMNS).eq('id', challengeId).maybeSingle()
  if (error || !data) return null
  const row = data as ChallengeRow
  const tz = await familyTimezone(row.user_id)
  const inputs = await loadChallengeInputs(admin, [row], tz)
  return withProgress([row], inputs)[0]
}

/**
 * The challenges a kid is part of that are worth showing them: running,
 * won (waiting for the reward), or delivered in the last week. A missed or
 * cancelled one just quietly goes away; kid mode is for encouragement.
 */
export async function loadKidChallenges(childId: string, ownerId: string): Promise<ChallengeWithProgress[]> {
  const admin = createServiceRoleClient() as any
  const tz = await familyTimezone(ownerId)
  const { data, error } = await admin
    .from('family_challenges')
    .select(CHALLENGE_COLUMNS)
    .eq('user_id', ownerId)
    .contains('child_ids', [childId])
    .in('status', ['active', 'delivered'])
    .order('ends_on', { ascending: true })
    .limit(20)
  if (error || !data) return []
  const rows = data as ChallengeRow[]
  const weekAgo = Date.now() - 7 * 86_400_000
  const recent = rows.filter(r => r.status === 'active' || (r.delivered_at && Date.parse(r.delivered_at) >= weekAgo))
  if (recent.length === 0) return []
  const inputs = await loadChallengeInputs(admin, recent, tz)
  return withProgress(recent, inputs).filter(c => c.phase !== 'missed' && c.phase !== 'cancelled')
}
