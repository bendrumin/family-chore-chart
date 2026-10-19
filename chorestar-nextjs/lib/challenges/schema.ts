import { z } from 'zod'
import { CHALLENGE_ROUTINE_TYPES, daysBetween, isIsoDate } from './progress'

/** The longest window a challenge may run (matches migration 031's check). */
export const CHALLENGE_MAX_DAYS = 93

/**
 * What a parent sends to create a challenge (POST /api/challenges). Mirrors
 * migration 031's column checks so a bad request fails here with a reason
 * rather than as a database error.
 */
export const createChallengeSchema = z
  .object({
    title: z.string().trim().min(1).max(60),
    emoji: z.string().trim().max(16).optional().nullable(),
    rewardText: z.string().trim().min(1).max(80),
    rewardCents: z.number().int().min(0).max(100_000).default(0),
    metric: z.enum(['chores', 'routines']),
    mode: z.enum(['team', 'each']),
    target: z.number().int().min(1).max(1000),
    choreFilter: z.enum(['any', 'bonus']).default('any'),
    routineType: z.enum(CHALLENGE_ROUTINE_TYPES as [string, ...string[]]).optional().nullable(),
    childIds: z.array(z.string().uuid()).min(2).max(12),
    startsOn: z.string().refine(isIsoDate, 'startsOn must be YYYY-MM-DD'),
    endsOn: z.string().refine(isIsoDate, 'endsOn must be YYYY-MM-DD'),
  })
  .refine(b => b.endsOn >= b.startsOn, { message: 'The challenge must end on or after its start', path: ['endsOn'] })
  .refine(b => daysBetween(b.startsOn, b.endsOn) < CHALLENGE_MAX_DAYS, {
    message: `A challenge can run up to ${CHALLENGE_MAX_DAYS} days`,
    path: ['endsOn'],
  })
  .refine(b => new Set(b.childIds).size >= 2, { message: 'Pick at least two kids', path: ['childIds'] })

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>

/** The database row an accepted request becomes (minus id/timestamps). */
export function challengeInsertRow(input: CreateChallengeInput, ownerId: string, createdBy: string) {
  return {
    user_id: ownerId,
    title: input.title,
    emoji: input.emoji || null,
    reward_text: input.rewardText,
    reward_cents: input.rewardCents,
    metric: input.metric,
    mode: input.mode,
    target: input.target,
    chore_filter: input.metric === 'chores' ? input.choreFilter : 'any',
    routine_type: input.metric === 'routines' ? input.routineType ?? null : null,
    child_ids: [...new Set(input.childIds)],
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: 'active' as const,
    created_by: createdBy,
  }
}

/** The 031 trigger's refusal for a free family, by its hint. */
export function isChallengePremiumError(err: { hint?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false
  return err.hint === 'premium_required_challenges' || /challenges are part of premium/i.test(err.message ?? '')
}
