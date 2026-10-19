/**
 * Managing shared chores (migration 025) from the parent apps. A shared chore
 * is one chores row per kid tied by rotation_group_id, so anything a parent
 * changes about "the chore" has to land on every copy, and stopping it has to
 * take the whole group out of the daily rotation. Pure helpers here so
 * shared-chores.test.ts covers them; the writes go through
 * /api/chores/shared/[groupId].
 */

import type { RotationMode } from './chore-rotation'

/** The rotation columns migration 025 adds (not in the generated types). */
export interface SharedChoreFields {
  rotation_group_id?: string | null
  rotation_mode?: string | null
}

/** The group a chore row belongs to, or null for an ordinary chore. */
export function sharedGroupOf(chore: SharedChoreFields): { groupId: string; mode: RotationMode } | null {
  const mode = chore.rotation_mode
  if (!chore.rotation_group_id || (mode !== 'rotate' && mode !== 'grab')) return null
  return { groupId: chore.rotation_group_id, mode }
}

/** The small badge on a shared chore in the parent list. */
export function sharedChoreBadge(chore: SharedChoreFields): { label: string; title: string } | null {
  const group = sharedGroupOf(chore)
  if (!group) return null
  return group.mode === 'rotate'
    ? { label: 'Takes turns', title: 'Shared chore: a different kid each week' }
    : { label: 'Bonus', title: 'Bonus chore: the first kid to finish it each day earns it' }
}

/** What a parent can change on a whole shared chore. */
export interface SharedChoreEdit {
  name?: string
  icon?: string | null
  rewardCents?: number
  daysOfWeek?: number[]
  category?: string | null
  requiresPhoto?: boolean
}

/**
 * The column update applied to every copy in the group. Only fields the
 * caller sent are included; days are de-duplicated and sorted the way the
 * create route stores them. Rotation columns and is_active are never touched
 * here: whose turn it is belongs to the rotation job.
 */
export function sharedChorePatch(edit: SharedChoreEdit): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (edit.name !== undefined) patch.name = edit.name.trim()
  if (edit.icon !== undefined) patch.icon = edit.icon
  if (edit.rewardCents !== undefined) patch.reward_cents = edit.rewardCents
  if (edit.daysOfWeek !== undefined) patch.days_of_week = [...new Set(edit.daysOfWeek)].sort((a, b) => a - b)
  if (edit.category !== undefined) patch.category = edit.category ?? 'household_chores'
  if (edit.requiresPhoto !== undefined) patch.requires_photo = edit.requiresPhoto
  return patch
}

/**
 * "Stop sharing" by archiving: every copy goes inactive and the group leaves
 * the rotation (rotation_mode null, so /api/cron/rotate-chores, which selects
 * rotation_mode = 'rotate', never switches a copy back on). rotation_group_id
 * stays, so each kid keeps what their past turns earned (computeBalance counts
 * copies that have a group id whether or not they are active).
 */
export const STOP_SHARING_ARCHIVE_UPDATE = {
  is_active: false,
  rotation_mode: null,
  rotation_order: null,
} as const

export type StopSharingAction = 'archive' | 'delete'

export function parseStopSharingAction(value: string | null | undefined): StopSharingAction | null {
  return value === 'archive' || value === 'delete' ? value : null
}

/**
 * Do these rows form one group the caller may manage? Every copy must belong
 * to a kid in `familyKidIds` (the family owner's kids; co-parents resolve to
 * the owner first). An empty group is "not found".
 */
export function groupOwnership(
  rows: { child_id: string }[],
  familyKidIds: Iterable<string>
): 'ok' | 'not_found' | 'forbidden' {
  if (rows.length === 0) return 'not_found'
  const kids = new Set(familyKidIds)
  return rows.every((r) => kids.has(r.child_id)) ? 'ok' : 'forbidden'
}

/** Split a selection of chore rows into ordinary chore ids and shared groups. */
export function splitShared<T extends SharedChoreFields & { id: string }>(
  chores: T[]
): { plainIds: string[]; groupIds: string[] } {
  const plainIds: string[] = []
  const groups = new Set<string>()
  for (const c of chores) {
    const g = sharedGroupOf(c)
    if (g) groups.add(g.groupId)
    else plainIds.push(c.id)
  }
  return { plainIds, groupIds: [...groups] }
}

/** A Postgres/PostgREST error raised by one of our triggers, by its hint or message. */
function hasHint(error: unknown, hint: string, message?: string): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { hint?: unknown; message?: unknown; details?: unknown }
  if (e.hint === hint) return true
  return typeof message === 'string' && typeof e.message === 'string' && e.message.includes(message)
}

/** The bonus-chore trigger (025) refusing a second kid's tick for the same day. */
export function isBonusAlreadyClaimedError(error: unknown): boolean {
  return hasHint(error, 'bonus_already_claimed', 'Someone already did this bonus chore today')
}

/** The free goal cap trigger (029) refusing another active goal. */
export function isFreeGoalLimitError(error: unknown): boolean {
  return hasHint(error, 'free_limit_goals', 'The free plan includes 1 active goal')
}
