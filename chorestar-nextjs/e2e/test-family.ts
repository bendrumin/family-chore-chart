import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as dotenvConfig } from 'dotenv'

/**
 * Cleanup for the recording flows, which run as TEST_USER_EMAIL's real family.
 * A flow that fails halfway used to leave its kids, chores and settings behind
 * (and two never cleaned up even on success), so each one now puts the family
 * back in afterEach, pass or fail. Only rows the test made during its own run
 * are removed: matched by name AND created since the test started, so a real
 * chore that happens to share a name is never touched.
 */

dotenvConfig({ path: '.env.local' })

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- some columns are newer than the generated types
type Admin = SupabaseClient<any>

let cached: { admin: Admin; familyId: string } | null = null

export async function testFamily(): Promise<{ admin: Admin; familyId: string }> {
  if (cached) return cached
  const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), key, { auth: { persistSession: false } })
  const { data, error } = await admin.from('profiles').select('id').eq('email', process.env.TEST_USER_EMAIL!).single()
  if (error || !data) throw new Error(`test family not found: ${error?.message}`)
  cached = { admin, familyId: data.id }
  return cached
}

async function kidIds(admin: Admin, familyId: string): Promise<string[]> {
  const { data } = await admin.from('children').select('id').eq('user_id', familyId)
  return (data ?? []).map((k: { id: string }) => k.id)
}

/** Deletes kids with one of these names that were added since `since`. */
export async function removeKidsAddedSince(names: string[], since: string) {
  const { admin, familyId } = await testFamily()
  await admin.from('children').delete().eq('user_id', familyId).in('name', names).gte('created_at', since)
}

/** Deletes chores whose name starts with `prefix` that were added since `since`. */
export async function removeChoresAddedSince(prefix: string, since: string) {
  const { admin, familyId } = await testFamily()
  const kids = await kidIds(admin, familyId)
  if (kids.length) await admin.from('chores').delete().in('child_id', kids).like('name', `${prefix}%`).gte('created_at', since)
}

/** Deletes routines whose name matches `pattern` (ilike) that were added since `since`. */
export async function removeRoutinesAddedSince(pattern: string, since: string) {
  const { admin, familyId } = await testFamily()
  const kids = await kidIds(admin, familyId)
  if (kids.length) await admin.from('routines').delete().in('child_id', kids).ilike('name', pattern).gte('created_at', since)
}

/** The family's settings row now, to hand back to restoreSettings. */
export async function snapshotSettings(): Promise<Record<string, unknown> | null> {
  const { admin, familyId } = await testFamily()
  const { data } = await admin.from('family_settings').select('*').eq('user_id', familyId).maybeSingle()
  return data
}

export async function restoreSettings(snapshot: Record<string, unknown> | null) {
  if (!snapshot) return
  const { admin, familyId } = await testFamily()
  const { user_id: _u, id: _i, created_at: _c, updated_at: _up, ...fields } = snapshot
  void _u; void _i; void _c; void _up
  await admin.from('family_settings').update(fields).eq('user_id', familyId)
}

/** Reward amounts of the family's chores with this name, to put back after. */
export async function snapshotChoreRewards(name: string): Promise<{ id: string; reward_cents: number }[]> {
  const { admin, familyId } = await testFamily()
  const kids = await kidIds(admin, familyId)
  if (!kids.length) return []
  const { data } = await admin.from('chores').select('id, reward_cents').in('child_id', kids).eq('name', name)
  return data ?? []
}

export async function restoreChoreRewards(rows: { id: string; reward_cents: number }[]) {
  const { admin } = await testFamily()
  for (const r of rows) await admin.from('chores').update({ reward_cents: r.reward_cents }).eq('id', r.id)
}

/** Deletes routine completions on the family's kids recorded since `since`. */
export async function removeRoutineCompletionsSince(since: string) {
  const { admin, familyId } = await testFamily()
  const kids = await kidIds(admin, familyId)
  if (kids.length) await admin.from('routine_completions').delete().in('child_id', kids).gte('completed_at', since)
}
