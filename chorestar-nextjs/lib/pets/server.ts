import 'server-only'
/* eslint-disable @typescript-eslint/no-explicit-any -- child_pets / child_pet_cosmetics (034), family_challenges (031) and vacation_periods are newer than the generated types */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { familyIsPremium } from '@/lib/utils/wallet'
import { addDays, todayIn, weekWindow, routineCompletionDate } from '@/lib/challenges/progress'
import { dueOn, vacationWindowFromSettings, type VacationWindow } from '@/lib/utils/schedule'
import { isVacationDay } from '@/lib/utils/streak'
import { hourIn } from './mood'
import { dayRefOf, type PetChore } from './progress'
import { buildPetState, PET_ROW_COLUMNS, type PetRow, type PetState } from './state'

/**
 * Server-side Star Pets reads (service role). Callers authorize first: the
 * kid API through the kid session (or a parent naming the child), the parent
 * API through family membership. Loads every row the pure functions need for
 * a set of kids in one family with a handful of queries, then hands each kid
 * to buildPetState.
 *
 * Every query that touches a table newer than the base schema fails soft: a
 * database without 034 shows pets as "not adopted", without 031 there are no
 * challenge wins, without 019 no vacations.
 */

const PAGE = 1000
const MAX_PAGES = 20

/** PostgREST caps a response at 1,000 rows; page through a year of ticks. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let p = 0; p < MAX_PAGES; p++) {
    const { data, error } = await page(p * PAGE, p * PAGE + PAGE - 1)
    if (error || !data) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

export interface FamilyPetContext {
  ownerId: string
  premium: boolean
  timeZone: string | null
  today: string
  hour: number
  vacations: VacationWindow[]
}

export async function loadFamilyPetContext(ownerId: string, now: Date = new Date()): Promise<FamilyPetContext> {
  const admin = createServiceRoleClient() as any
  const [premium, settingsRes, periodsRes] = await Promise.all([
    familyIsPremium(ownerId),
    admin.from('family_settings').select('*').eq('user_id', ownerId).maybeSingle(),
    admin.from('vacation_periods').select('starts_on, ends_on').eq('user_id', ownerId).then(
      (r: any) => r,
      () => ({ data: null, error: true })
    ),
  ])
  const settings = settingsRes?.data ?? null
  const timeZone: string | null = settings?.timezone ?? null
  const vacations: VacationWindow[] = []
  if (!periodsRes?.error && Array.isArray(periodsRes?.data)) {
    for (const r of periodsRes.data as Array<{ starts_on?: unknown; ends_on?: unknown }>) {
      if (typeof r.starts_on === 'string' && typeof r.ends_on === 'string') vacations.push({ starts_on: r.starts_on, ends_on: r.ends_on })
    }
  }
  const live = vacationWindowFromSettings(settings)
  if (live) vacations.push(live)
  return { ownerId, premium, timeZone, today: todayIn(timeZone, now), hour: hourIn(timeZone, now), vacations }
}

export async function loadPetRows(childIds: string[]): Promise<Map<string, PetRow>> {
  const map = new Map<string, PetRow>()
  if (childIds.length === 0) return map
  const admin = createServiceRoleClient() as any
  const { data, error } = await admin.from('child_pets').select(PET_ROW_COLUMNS).in('child_id', childIds)
  if (error || !data) return map
  for (const row of data as PetRow[]) map.set(row.child_id, row)
  return map
}

export async function loadOwnedCosmetics(childIds: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  for (const id of childIds) map.set(id, new Set())
  if (childIds.length === 0) return map
  const admin = createServiceRoleClient() as any
  const { data, error } = await admin.from('child_pet_cosmetics').select('child_id, item_id').in('child_id', childIds)
  if (error || !data) return map
  for (const r of data as Array<{ child_id: string; item_id: string }>) map.get(r.child_id)?.add(r.item_id)
  return map
}

/** Pet state for each kid (same family). Kids not listed in the result were not found. */
export async function loadPetStates(ctx: FamilyPetContext, childIds: string[]): Promise<Map<string, PetState>> {
  const admin = createServiceRoleClient() as any
  const ids = [...new Set(childIds)]
  const out = new Map<string, PetState>()
  if (ids.length === 0) return out

  const [rows, owned] = await Promise.all([loadPetRows(ids), loadOwnedCosmetics(ids)])

  // History reaches back to the earliest adoption; mood only needs today.
  let from = ctx.today
  for (const id of ids) {
    const r = rows.get(id)
    if (r?.species && r.adopted_on && r.adopted_on.slice(0, 10) < from) from = r.adopted_on.slice(0, 10)
  }
  const weekFrom = weekWindow(from).starts_on

  const [chores, routines, challenges] = await Promise.all([
    fetchAll<PetChore & { child_id: string }>((a, b) =>
      admin.from('chores').select('id, child_id, days_of_week, is_active').in('child_id', ids).order('id').range(a, b)
    ),
    admin.from('routines').select('id, child_id, is_active').in('child_id', ids),
    admin
      .from('family_challenges')
      .select('id, child_ids, delivered_at')
      .eq('user_id', ctx.ownerId)
      .eq('status', 'delivered')
      .gte('delivered_at', `${addDays(from, -1)}T00:00:00Z`)
      .then(
        (r: any) => r,
        () => ({ data: null, error: true })
      ),
  ])

  const choreIds = chores.map(c => c.id)
  const [completions, routineCompletions] = await Promise.all([
    choreIds.length === 0
      ? Promise.resolve([] as Array<{ chore_id: string; week_start: string; day_of_week: number; status: string | null }>)
      : fetchAll<{ chore_id: string; week_start: string; day_of_week: number; status: string | null }>((a, b) =>
          admin
            .from('chore_completions')
            .select('chore_id, week_start, day_of_week, status')
            .in('chore_id', choreIds)
            .gte('week_start', weekFrom)
            .order('id')
            .range(a, b)
        ),
    fetchAll<{ routine_id: string; child_id: string; date: string | null; completed_at: string | null }>((a, b) =>
      admin
        .from('routine_completions')
        .select('routine_id, child_id, date, completed_at')
        .in('child_id', ids)
        .gte('date', addDays(from, -1))
        .order('id')
        .range(a, b)
    ),
  ])

  const choreOwner = new Map(chores.map(c => [c.id, c.child_id]))
  const today = dayRefOf(ctx.today)
  const onVacation = isVacationDay(today, ctx.vacations)

  for (const id of ids) {
    const kidChores = chores.filter(c => c.child_id === id)
    const kidTicks = completions.filter(c => choreOwner.get(c.chore_id) === id)
    const kidRoutineDone = routineCompletions.filter(c => c.child_id === id)
    const kidRoutines = ((routines.data ?? []) as Array<{ id: string; child_id: string; is_active: boolean | null }>).filter(
      r => r.child_id === id && r.is_active !== false
    )
    const wins = ((challenges?.error ? [] : challenges?.data ?? []) as Array<{ id: string; child_ids: string[]; delivered_at: string | null }>)
      .filter(c => Array.isArray(c.child_ids) && c.child_ids.includes(id))
      .map(c => ({ id: c.id, delivered_at: c.delivered_at }))

    // Today, for the mood: what's due, and what the kid has done (a tick
    // waiting for a parent's OK still counts as the kid's part).
    const dueToday = onVacation ? [] : dueOn(kidChores.filter(c => c.is_active !== false), today.dayOfWeek)
    const tickedToday = new Set(
      kidTicks
        .filter(c => c.week_start?.slice(0, 10) === today.weekStart && c.day_of_week === today.dayOfWeek && c.status !== 'rejected')
        .map(c => c.chore_id)
    )
    const routinesToday = new Set(
      kidRoutineDone.filter(c => routineCompletionDate(c, ctx.timeZone) === ctx.today).map(c => c.routine_id)
    )

    out.set(
      id,
      buildPetState({
        row: rows.get(id) ?? null,
        premium: ctx.premium,
        today: ctx.today,
        owned: owned.get(id) ?? new Set(),
        chores: kidChores,
        choreCompletions: kidTicks,
        routineCompletions: kidRoutineDone,
        challengeWins: wins,
        vacations: ctx.vacations,
        timeZone: ctx.timeZone,
        todayCounts: {
          choresDue: dueToday.length,
          choresDone: dueToday.filter(c => tickedToday.has(c.id)).length,
          routinesActive: kidRoutines.length,
          routinesDoneToday: routinesToday.size,
        },
        hour: ctx.hour,
      })
    )
  }
  return out
}

/** One kid's pet, for the kid API. */
export async function loadPetState(ownerId: string, childId: string): Promise<{ ctx: FamilyPetContext; state: PetState | null }> {
  const ctx = await loadFamilyPetContext(ownerId)
  const states = await loadPetStates(ctx, [childId])
  return { ctx, state: states.get(childId) ?? null }
}
