/* eslint-disable @typescript-eslint/no-explicit-any -- family_challenges (031) and chores.rotation_mode (025) are newer than the generated types */
import {
  challengePhase,
  computeChallengeProgress,
  fetchRange,
  todayIn,
  daysLeft,
  type ChallengeInputs,
  type ChallengePhase,
  type ChallengeProgress,
  type ChallengeRow,
} from './progress'

/**
 * Loading what challenge progress is derived from. Takes any Supabase client:
 * the parent dashboard passes its RLS client (owner and co-parents can read
 * these tables since 007), the kid API and the deliver route pass the service
 * role. Either way the numbers come out of the same pure functions.
 */

export interface ChallengeWithProgress {
  challenge: ChallengeRow
  progress: ChallengeProgress
  phase: ChallengePhase
  daysLeft: number
}

export const CHALLENGE_COLUMNS =
  'id, user_id, title, emoji, reward_text, reward_cents, metric, mode, target, chore_filter, routine_type, child_ids, starts_on, ends_on, status, delivered_at, created_at'

/** The completions every given challenge needs, in four queries total. */
export async function loadChallengeInputs(
  client: any,
  challenges: ChallengeRow[],
  timeZone?: string | null
): Promise<ChallengeInputs> {
  const empty: ChallengeInputs = { chores: [], choreCompletions: [], routines: [], routineCompletions: [], timeZone }
  const range = fetchRange(challenges)
  if (!range) return empty

  const choreKids = new Set<string>()
  const routineKids = new Set<string>()
  for (const c of challenges) {
    for (const id of c.child_ids) (c.metric === 'chores' ? choreKids : routineKids).add(id)
  }

  const inputs: ChallengeInputs = { ...empty }

  if (choreKids.size > 0) {
    // Every chore the kids have, archived or not: a tick on a rotation copy
    // that isn't this kid's turn any more still happened.
    const withMode = await client
      .from('chores')
      .select('id, child_id, rotation_mode')
      .in('child_id', [...choreKids])
    const chores = withMode.error
      ? (await client.from('chores').select('id, child_id').in('child_id', [...choreKids])).data
      : withMode.data
    inputs.chores = (chores ?? []) as ChallengeInputs['chores']
    if (inputs.chores.length > 0) {
      const { data } = await client
        .from('chore_completions')
        .select('chore_id, week_start, day_of_week, status')
        .in('chore_id', inputs.chores.map(c => c.id))
        .gte('week_start', range.weekFrom)
        .lte('week_start', range.weekTo)
      inputs.choreCompletions = (data ?? []) as ChallengeInputs['choreCompletions']
    }
  }

  if (routineKids.size > 0) {
    const kids = [...routineKids]
    const [{ data: routines }, { data: completions }] = await Promise.all([
      client.from('routines').select('id, child_id, type').in('child_id', kids),
      client
        .from('routine_completions')
        .select('routine_id, child_id, date, completed_at')
        .in('child_id', kids)
        .gte('date', range.dateFrom)
        .lte('date', range.dateTo),
    ])
    inputs.routines = (routines ?? []) as ChallengeInputs['routines']
    inputs.routineCompletions = (completions ?? []) as ChallengeInputs['routineCompletions']
  }

  return inputs
}

/** Progress, phase and days left for each challenge, at `now` in the family's zone. */
export function withProgress(
  challenges: ChallengeRow[],
  inputs: ChallengeInputs,
  now: Date = new Date()
): ChallengeWithProgress[] {
  const today = todayIn(inputs.timeZone, now)
  return challenges.map(challenge => {
    const progress = computeChallengeProgress(challenge, inputs)
    return {
      challenge,
      progress,
      phase: challengePhase(challenge, progress, today),
      daysLeft: daysLeft(challenge, today),
    }
  })
}

const PHASE_ORDER: Record<ChallengePhase, number> = {
  won: 0,
  active: 1,
  upcoming: 2,
  delivered: 3,
  missed: 4,
  cancelled: 5,
}

/** Won-and-waiting first (the parent has something to do), then running ones. */
export function sortChallenges(list: ChallengeWithProgress[]): ChallengeWithProgress[] {
  return [...list].sort(
    (a, b) =>
      PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
      a.challenge.ends_on.localeCompare(b.challenge.ends_on) ||
      a.challenge.created_at.localeCompare(b.challenge.created_at)
  )
}
