/**
 * Reads, with the service role, what each family has tried and when they were
 * last active. Feeds lib/engagement/discovery (pure) from the lapse-nudge cron
 * and the dashboard's discover card.
 *
 * The cron covers every family, so whole small tables are read and joined in
 * memory rather than sending a few hundred child ids through `in()`, which
 * would push the request URL past what proxies accept. The per-family path
 * narrows by owner first and stays small.
 */
import type { FamilyUsage } from './discovery'

// The service-role client; several of these tables are not in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

export interface FamilyData {
  ownerId: string
  /** The family's first child, which is who the copy talks about. */
  kidName: string | null
  childIds: string[]
  usage: FamilyUsage
}

const PAGE = 1000

/** PostgREST caps a response at 1000 rows; page through anything that can exceed it. */
export async function fetchAll<T>(build: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

export async function loadFamilies(admin: Admin, onlyOwner?: string): Promise<Map<string, FamilyData>> {
  const children = await fetchAll<{ id: string; user_id: string; name: string; created_at: string }>((from, to) => {
    let q = admin.from('children').select('id, user_id, name, created_at').order('created_at', { ascending: true }).range(from, to)
    if (onlyOwner) q = q.eq('user_id', onlyOwner)
    return q
  })

  const families = new Map<string, FamilyData>()
  const ownerOfChild = new Map<string, string>()
  for (const c of children) {
    ownerOfChild.set(c.id, c.user_id)
    const f = families.get(c.user_id) ?? {
      ownerId: c.user_id,
      kidName: null,
      childIds: [],
      usage: { hasPin: false, hasRoutine: false, hasPet: false, hasMoney: false, hasChallenge: false, hasCalendar: false },
    }
    if (!f.kidName && c.name) f.kidName = c.name.trim().split(/\s+/)[0]
    f.childIds.push(c.id)
    families.set(c.user_id, f)
  }
  if (!families.size) return families

  const childIds = onlyOwner ? [...ownerOfChild.keys()] : null
  const byChild = (table: string, extra?: (q: Admin) => Admin) =>
    fetchAll<{ child_id: string }>((from, to) => {
      let q = admin.from(table).select('child_id').range(from, to)
      if (childIds) q = q.in('child_id', childIds)
      if (extra) q = extra(q)
      return q
    })
  const byOwner = (table: string, column: string) =>
    fetchAll<Record<string, string>>((from, to) => {
      let q = admin.from(table).select(column).range(from, to)
      if (onlyOwner) q = q.eq(column, onlyOwner)
      return q
    })

  const [pins, routines, pets, money, challenges, feeds] = await Promise.all([
    byChild('child_pins'),
    byChild('routines', (q) => q.eq('is_active', true)),
    byChild('child_pets'),
    byChild('child_money_settings'),
    byOwner('family_challenges', 'user_id'),
    byOwner('calendar_feeds', 'family_id'),
  ])

  const mark = (rows: { child_id: string }[], key: keyof FamilyUsage) => {
    for (const r of rows) {
      const owner = ownerOfChild.get(r.child_id)
      if (owner) families.get(owner)!.usage[key] = true
    }
  }
  mark(pins, 'hasPin')
  mark(routines, 'hasRoutine')
  mark(pets, 'hasPet')
  mark(money, 'hasMoney')
  for (const r of challenges) {
    const f = families.get(r.user_id)
    if (f) f.usage.hasChallenge = true
  }
  for (const r of feeds) {
    const f = families.get(r.family_id)
    if (f) f.usage.hasCalendar = true
  }

  return families
}

/**
 * Most recent activity per family since `since`: a chore ticked, a routine
 * finished, or a kid signing in. A family absent from the result had nothing
 * in the window, which for the lapse cron means "too long gone to nudge".
 */
export async function loadLastActivity(admin: Admin, families: Map<string, FamilyData>, since: Date): Promise<Map<string, Date>> {
  const ownerOfChild = new Map<string, string>()
  for (const f of families.values()) for (const id of f.childIds) ownerOfChild.set(id, f.ownerId)
  const sinceIso = since.toISOString()

  const chores = await fetchAll<{ id: string; child_id: string }>((from, to) => admin.from('chores').select('id, child_id').range(from, to))
  const childOfChore = new Map(chores.map((c) => [c.id, c.child_id]))

  const [choreDone, routineDone, kidSessions] = await Promise.all([
    fetchAll<{ chore_id: string; completed_at: string }>((from, to) =>
      admin.from('chore_completions').select('chore_id, completed_at').gte('completed_at', sinceIso).range(from, to)),
    fetchAll<{ child_id: string; completed_at: string }>((from, to) =>
      admin.from('routine_completions').select('child_id, completed_at').gte('completed_at', sinceIso).range(from, to)),
    fetchAll<{ child_id: string; created_at: string }>((from, to) =>
      admin.from('kid_sessions').select('child_id, created_at').gte('created_at', sinceIso).range(from, to)),
  ])

  const last = new Map<string, Date>()
  const bump = (childId: string | undefined, at: string) => {
    const owner = childId ? ownerOfChild.get(childId) : undefined
    if (!owner) return
    const t = new Date(at)
    const prev = last.get(owner)
    if (!prev || t > prev) last.set(owner, t)
  }
  for (const r of choreDone) bump(childOfChore.get(r.chore_id), r.completed_at)
  for (const r of routineDone) bump(r.child_id, r.completed_at)
  for (const r of kidSessions) bump(r.child_id, r.created_at)
  return last
}
