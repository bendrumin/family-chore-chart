/**
 * Back to the free limits when a subscription ends (migration 038).
 *
 * October 2026: families were buying a month to get past the free limits
 * (one bought, added a fourth kid, and turned renewal off twelve minutes
 * later), then keeping everything after it lapsed, because the limits were
 * only checked when adding. Now, when Premium ends, the oldest 3 kids and
 * the oldest 20 active chores stay on and the rest are paused: hidden from
 * kids, still visible to parents, never deleted, and back the moment the
 * family resubscribes. A parent can swap which ones stay on.
 *
 * Only a subscription ENDING calls this (Apple expiry, Stripe cancellation,
 * Play expiry, a free trial running out), so families who never subscribed,
 * including grandfathered charts built before the limits existed, are never
 * touched. Turning renewal off pauses nothing: that month is paid for.
 */
import { getChildLimit, getChoreLimit } from '@/lib/utils/subscription'

export const FREE_KID_LIMIT = getChildLimit('free')
export const FREE_CHORE_LIMIT = getChoreLimit('free')

export interface LimitKid { id: string; created_at: string; paused_by_plan?: boolean }
export interface LimitChore { id: string; child_id: string; created_at: string; is_active: boolean; paused_by_plan: boolean }

const byAge = (a: { created_at: string; id: string }, b: { created_at: string; id: string }) =>
  a.created_at === b.created_at ? (a.id < b.id ? -1 : 1) : a.created_at < b.created_at ? -1 : 1

/** What is on now stays on (a parent's choice survives a rebalance), then oldest first. */
const byOnThenAge = (a: { created_at: string; id: string; paused_by_plan?: boolean }, b: { created_at: string; id: string; paused_by_plan?: boolean }) =>
  Number(!!a.paused_by_plan) - Number(!!b.paused_by_plan) || byAge(a, b)

/**
 * Which kids and chores the free plan pauses. A chore counts toward the limit
 * if it is switched on, or was only off because the plan paused it; chores a
 * parent turned off themselves are left alone. A paused kid's chores pause
 * with them. Whatever is on now stays on (so a parent's choice survives),
 * then oldest first, so what a family set up first keeps working.
 */
export function pickPaused(
  kids: LimitKid[],
  chores: LimitChore[],
  limits = { kids: FREE_KID_LIMIT, chores: FREE_CHORE_LIMIT }
): { pausedKids: string[]; pausedChores: string[]; activeChores: string[] } {
  const ordered = [...kids].sort(byOnThenAge)
  const kept = new Set(ordered.slice(0, limits.kids).map((k) => k.id))
  const pausedKids = ordered.slice(limits.kids).map((k) => k.id)

  const counted = chores.filter((c) => c.is_active || c.paused_by_plan).sort(byOnThenAge)
  const ofKept = counted.filter((c) => kept.has(c.child_id))
  const activeChores = ofKept.slice(0, limits.chores).map((c) => c.id)
  const active = new Set(activeChores)
  const pausedChores = counted.filter((c) => !active.has(c.id)).map((c) => c.id)
  return { pausedKids, pausedChores, activeChores }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- paused_by_plan (038) is newer than the generated types
type Admin = any

type Named<T> = T & { name: string }

async function loadFamily(admin: Admin, ownerId: string) {
  const { data: kids, error: kErr } = await admin.from('children').select('id, name, created_at, paused_by_plan').eq('user_id', ownerId)
  if (kErr) throw kErr
  const ids = (kids ?? []).map((k: LimitKid) => k.id)
  if (!ids.length) return { kids: [] as Named<LimitKid>[], chores: [] as Named<LimitChore>[] }
  const { data: chores, error: cErr } = await admin
    .from('chores').select('id, child_id, name, created_at, is_active, paused_by_plan').in('child_id', ids)
  if (cErr) throw cErr
  return { kids: (kids ?? []) as Named<LimitKid>[], chores: (chores ?? []) as Named<LimitChore>[] }
}

/** Pause whatever is over the free limits. Idempotent; also rebalances. */
export async function applyFreeLimits(admin: Admin, ownerId: string): Promise<{ kids: number; chores: number }> {
  const { kids, chores } = await loadFamily(admin, ownerId)
  const { pausedKids, pausedChores, activeChores } = pickPaused(kids, chores)
  const kidIds = kids.map((k) => k.id)
  if (kidIds.length) {
    await admin.from('children').update({ paused_by_plan: false }).in('id', kidIds.filter((id) => !pausedKids.includes(id)))
  }
  if (pausedKids.length) {
    await admin.from('children').update({ paused_by_plan: true }).in('id', pausedKids)
    // Signed-in kid devices for a paused kid stop working now, not in 8 hours.
    await admin.from('kid_sessions').delete().in('child_id', pausedKids)
  }
  if (pausedChores.length) {
    await admin.from('chores').update({ paused_by_plan: true, is_active: false }).in('id', pausedChores)
  }
  const unpause = chores.filter((c) => c.paused_by_plan && activeChores.includes(c.id)).map((c) => c.id)
  if (unpause.length) {
    await admin.from('chores').update({ paused_by_plan: false, is_active: true }).in('id', unpause)
  }
  return { kids: pausedKids.length, chores: pausedChores.length }
}

/**
 * A free family's own pick of what stays on: up to FREE_KID_LIMIT kids and
 * FREE_CHORE_LIMIT chores, everything else paused. Ids outside the family
 * are ignored; a chore of a kid left paused can't stay on.
 */
export async function chooseActive(
  admin: Admin,
  ownerId: string,
  keepKids: string[],
  keepChores: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { kids, chores } = await loadFamily(admin, ownerId)
  const kidIds = new Set(kids.map((k) => k.id))
  const kidsOn = [...new Set(keepKids)].filter((id) => kidIds.has(id))
  if (kidsOn.length > FREE_KID_LIMIT) return { ok: false, error: `Up to ${FREE_KID_LIMIT} kids` }
  const on = new Set(kidsOn)
  const choresOn = [...new Set(keepChores)].filter((id) => chores.some((c) => c.id === id && on.has(c.child_id) && (c.is_active || c.paused_by_plan)))
  if (choresOn.length > FREE_CHORE_LIMIT) return { ok: false, error: `Up to ${FREE_CHORE_LIMIT} chores` }

  const kidsOff = kids.map((k) => k.id).filter((id) => !on.has(id))
  if (kidsOn.length) await admin.from('children').update({ paused_by_plan: false }).in('id', kidsOn)
  if (kidsOff.length) {
    await admin.from('children').update({ paused_by_plan: true }).in('id', kidsOff)
    await admin.from('kid_sessions').delete().in('child_id', kidsOff)
  }
  const choreOn = new Set(choresOn)
  const choresOff = chores.filter((c) => (c.is_active || c.paused_by_plan) && !choreOn.has(c.id)).map((c) => c.id)
  if (choresOff.length) await admin.from('chores').update({ paused_by_plan: true, is_active: false }).in('id', choresOff)
  // Clear the flag first: the 038 trigger keeps a paused chore off.
  if (choresOn.length) await admin.from('chores').update({ paused_by_plan: false, is_active: true }).in('id', choresOn)
  return { ok: true }
}

/** Everything a parent screen needs: what's paused now, and the full list to choose from. */
export async function familyLimits(admin: Admin, ownerId: string) {
  const { kids, chores } = await loadFamily(admin, ownerId)
  const ordered = [...kids].sort(byAge)
  return {
    limits: { kids: FREE_KID_LIMIT, chores: FREE_CHORE_LIMIT },
    pausedKids: ordered.filter((k) => k.paused_by_plan).map((k) => ({ id: k.id, name: k.name })),
    pausedChores: chores.filter((c) => c.paused_by_plan).length,
    kids: ordered.map((k) => ({
      id: k.id,
      name: k.name,
      paused: !!k.paused_by_plan,
      chores: chores
        .filter((c) => c.child_id === k.id && (c.is_active || c.paused_by_plan))
        .sort(byAge)
        .map((c) => ({ id: c.id, name: c.name, on: c.is_active && !c.paused_by_plan })),
    })),
    /** If the free limits applied right now: what would pause (the "Premium is ending" warning). */
    wouldPause: (() => {
      const p = pickPaused(kids.map((k) => ({ ...k, paused_by_plan: false })), chores)
      return {
        kids: kids.filter((k) => p.pausedKids.includes(k.id)).map((k) => k.name),
        chores: p.pausedChores.filter((id) => !p.pausedKids.some((kid) => chores.find((c) => c.id === id)?.child_id === kid)).length,
      }
    })(),
  }
}

/** Premium again: everything the plan paused comes back. */
export async function liftFreeLimits(admin: Admin, ownerId: string): Promise<void> {
  const { data: kids } = await admin.from('children').select('id').eq('user_id', ownerId)
  const ids = (kids ?? []).map((k: { id: string }) => k.id)
  if (!ids.length) return
  await admin.from('children').update({ paused_by_plan: false }).in('id', ids).eq('paused_by_plan', true)
  // Clear the flag first: the 038 trigger keeps a paused chore off.
  await admin.from('chores').update({ paused_by_plan: false, is_active: true }).in('child_id', ids).eq('paused_by_plan', true)
}

/**
 * Call right after a profile's tier is written. Never throws: the tier change
 * is what matters to the store's webhook, and a retry would find the tier
 * already changed and skip this anyway, so a failure is logged instead.
 */
export async function onPlanChange(admin: Admin, ownerId: string, tier: string): Promise<void> {
  try {
    if (tier === 'free') {
      const paused = await applyFreeLimits(admin, ownerId)
      if (paused.kids || paused.chores) console.log(`[plan-limits] ${ownerId}: paused ${paused.kids} kid(s), ${paused.chores} chore(s)`)
    } else {
      await liftFreeLimits(admin, ownerId)
    }
  } catch (err) {
    console.error('[plan-limits]', ownerId, tier, err)
  }
}
