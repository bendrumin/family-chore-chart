import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { childDatedEarnings, owedCents, type DatedCompletion } from '@/lib/utils/earnings'
import { isPremium } from '@/lib/utils/subscription'
import { FREE_GOAL_LIMIT, FREE_STORE_ITEM_LIMIT } from '@/lib/constants/rewards'
import { challengeRewardCents } from '@/lib/challenges/server'
import {
  computeJars,
  currentVersion,
  earnedChoreMinutes,
  NO_SPLIT,
  type IncomeEvent,
  type Jar,
  type JarEntry,
  type JarSplit,
  type SplitVersion,
} from '@/lib/utils/money'

/**
 * The kid's wallet, server-side (migrations 011, 017, 030).
 *
 * Balance is DERIVED on every read: everything ever earned (approved ticks
 * only, through the shared earnings rules) plus money_ledger credits (weekly
 * allowance, interest), minus everything paid out and every ledger deduction
 * (fines, repayments, donations). A stored running total would drift the
 * moment history changed underneath it. Store redemptions and goal payouts
 * both spend it by recording a payout row.
 *
 * Jars (Premium, migration 030) come from the same rows: lib/utils/money.ts
 * splits each day's income by the split in force that day, and every payout
 * and ledger row says which jar it came out of. With jars off the whole
 * balance is Spend.
 */

export interface JarState {
  /** Jars are on now: the family is Premium and the parent switched them on. */
  enabled: boolean
  /** The current split; 100/0/0 when off. */
  split: JarSplit
  spendCents: number
  saveCents: number
  giveCents: number
}

export interface Balance {
  childId: string
  /** Everything that came in: chore earnings plus weekly allowance and interest. */
  earnedCents: number
  /** Chore earnings alone. */
  choreEarnedCents: number
  paidCents: number
  /** Fines, repayments and donations, as a positive number. */
  deductedCents: number
  /** Signed. Below zero only after a deduction the parent allowed to go negative. */
  balanceCents: number
  /** max(0, balance): what older clients read as "owed". */
  owedCents: number
  /** What the store and a normal payout can use: Spend with jars on, else the balance. */
  spendableCents: number
  /** What goals fill from: Save with jars on, else the balance. */
  goalBaseCents: number
  jars: JarState
}

export interface WalletChild {
  id: string
  name: string
  user_id: string
}

export async function loadChild(childId: string): Promise<WalletChild | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin.from('children').select('id, name, user_id').eq('id', childId).maybeSingle()
  return data ?? null
}

interface LedgerRow {
  kind: string
  jar: Jar | null
  amount_cents: number
  effective_on: string
}

interface SplitRow {
  enabled: boolean
  spend_pct: number
  save_pct: number
  give_pct: number
  effective_on: string
  created_at: string
}

/** Rows from the migration 030 tables; empty where the migration hasn't run. */
async function loadMoneyRows(childId: string): Promise<{ ledger: LedgerRow[]; splits: SplitVersion[] }> {
  // money_ledger and money_jar_splits (migration 030) aren't in the generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any
  const [ledgerRes, splitRes] = await Promise.all([
    admin.from('money_ledger').select('kind, jar, amount_cents, effective_on').eq('child_id', childId),
    admin
      .from('money_jar_splits')
      .select('enabled, spend_pct, save_pct, give_pct, effective_on, created_at')
      .eq('child_id', childId),
  ])
  const ledger = ledgerRes.error ? [] : ((ledgerRes.data ?? []) as LedgerRow[])
  const splits: SplitVersion[] = splitRes.error
    ? []
    : ((splitRes.data ?? []) as SplitRow[]).map((r) => ({
        enabled: r.enabled,
        spend: r.spend_pct,
        save: r.save_pct,
        give: r.give_pct,
        effectiveOn: r.effective_on,
        createdAt: r.created_at,
      }))
  return { ledger, splits }
}

export async function computeBalance(child: WalletChild, opts: { premium?: boolean } = {}): Promise<Balance> {
  const admin = createServiceRoleClient()

  // Shared chores (migration 025) count whether or not it's this kid's turn
  // this week, so last week's rotation money never disappears. Falls back to
  // active chores only where the migration hasn't run yet.
  const withShared = await admin
    .from('chores')
    .select('id, reward_cents, days_of_week')
    .eq('child_id', child.id)
    .or('is_active.eq.true,rotation_group_id.not.is.null')
  const chores = withShared.error
    ? (await admin
        .from('chores')
        .select('id, reward_cents, days_of_week')
        .eq('child_id', child.id)
        .eq('is_active', true)).data
    : withShared.data
  const choreList = chores ?? []

  // Dated, so the jar split can apply by the day the money was earned. Sums
  // to the same total childTotalEarningsCents always gave.
  const income: IncomeEvent[] = []
  if (choreList.length > 0) {
    const [{ data: completions }, { data: settings }] = await Promise.all([
      admin
        .from('chore_completions')
        .select('chore_id, day_of_week, week_start, status')
        .in('chore_id', choreList.map(c => c.id)),
      admin
        .from('family_settings')
        .select('reward_mode, daily_reward_cents, weekly_bonus_cents')
        .eq('user_id', child.user_id)
        .maybeSingle(),
    ])
    income.push(...childDatedEarnings(choreList, (completions ?? []) as DatedCompletion[], settings))
  }
  const choreEarned = income.reduce((sum, e) => sum + e.cents, 0)

  // allowance_payouts.jar is migration 030; fall back to the bare amount.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withJar = await (admin as any).from('allowance_payouts').select('amount_cents, jar').eq('child_id', child.id)
  const payouts: Array<{ amount_cents: number | null; jar?: Jar | null }> = withJar.error
    ? ((await admin.from('allowance_payouts').select('amount_cents').eq('child_id', child.id)).data ?? [])
    : (withJar.data ?? [])
  const paid = payouts.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0)

  const [{ ledger, splits }, premium] = await Promise.all([
    loadMoneyRows(child.id),
    opts.premium === undefined ? familyIsPremium(child.user_id) : Promise.resolve(opts.premium),
  ])

  // Payouts before migration 030 have no jar: they came out of the one
  // balance, which is Spend.
  const entries: JarEntry[] = payouts.map((p) => ({ jar: p.jar ?? 'spend', cents: -(p.amount_cents ?? 0) }))
  let credits = 0
  let deducted = 0
  for (const row of ledger) {
    if (row.jar === null) {
      // Income the split applies to (weekly allowance).
      income.push({ date: row.effective_on, cents: row.amount_cents })
      credits += row.amount_cents
      continue
    }
    entries.push({ jar: row.jar, cents: row.amount_cents })
    if (row.kind === 'transfer') continue
    if (row.amount_cents >= 0) credits += row.amount_cents
    else deducted += -row.amount_cents
  }

  // Delivered family challenges with money attached (migration 031) credit
  // each kid through their own ledger. Undated, so they land in Spend rather
  // than being split; with jars off it is all one balance anyway.
  const challengeCents = await challengeRewardCents(child.id)
  if (challengeCents > 0) {
    credits += challengeCents
    entries.push({ jar: 'spend', cents: challengeCents })
  }

  const jars = computeJars(income, entries, splits)
  const current = currentVersion(splits)
  const jarsOn = premium && !!current?.enabled
  const earned = choreEarned + credits
  const balance = earned - paid - deducted
  const owed = owedCents(earned, paid + deducted)

  return {
    childId: child.id,
    earnedCents: earned,
    choreEarnedCents: choreEarned,
    paidCents: paid,
    deductedCents: deducted,
    balanceCents: balance,
    owedCents: owed,
    spendableCents: jarsOn ? Math.max(0, jars.spend) : owed,
    goalBaseCents: jarsOn ? Math.max(0, jars.save) : owed,
    jars: {
      enabled: jarsOn,
      split: jarsOn && current ? { spend: current.spend, save: current.save, give: current.give } : NO_SPLIT,
      spendCents: jarsOn ? jars.spend : balance,
      saveCents: jarsOn ? jars.save : 0,
      giveCents: jarsOn ? jars.give : 0,
    },
  }
}

export interface MinutesBalance {
  earnedMinutes: number
  usedMinutes: number
  balanceMinutes: number
}

/** Screen-time minutes (migration 030): earned from chores and routines, minus what was used. */
export async function computeMinutes(childId: string): Promise<MinutesBalance> {
  // reward_minutes, minutes_earned and screen_minutes_ledger aren't in the generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any
  const empty = { earnedMinutes: 0, usedMinutes: 0, balanceMinutes: 0 }
  const { data: chores, error } = await admin
    .from('chores')
    .select('id, reward_minutes')
    .eq('child_id', childId)
    .gt('reward_minutes', 0)
  if (error) return empty

  const minutesByChore = new Map<string, number>(
    ((chores ?? []) as Array<{ id: string; reward_minutes: number }>).map((c) => [c.id, c.reward_minutes])
  )
  const [completionsRes, routineRes, ledgerRes] = await Promise.all([
    minutesByChore.size
      ? admin
          .from('chore_completions')
          .select('chore_id, day_of_week, week_start, status')
          .in('chore_id', [...minutesByChore.keys()])
      : Promise.resolve({ data: [] }),
    admin.from('routine_completions').select('minutes_earned').eq('child_id', childId).gt('minutes_earned', 0),
    admin.from('screen_minutes_ledger').select('amount_minutes').eq('child_id', childId),
  ])
  const choreMinutes = earnedChoreMinutes(minutesByChore, completionsRes.data ?? [])
  const routineMinutes = ((routineRes.data ?? []) as Array<{ minutes_earned: number }>).reduce(
    (s, r) => s + (r.minutes_earned ?? 0),
    0
  )
  let used = 0
  let added = 0
  for (const row of (ledgerRes.data ?? []) as Array<{ amount_minutes: number }>) {
    if (row.amount_minutes < 0) used += -row.amount_minutes
    else added += row.amount_minutes
  }
  const earned = choreMinutes + routineMinutes + added
  return { earnedMinutes: earned, usedMinutes: used, balanceMinutes: earned - used }
}

export interface LedgerItem {
  id: string
  kind: string
  jar: Jar | null
  amountCents: number
  effectiveOn: string
  note: string | null
  createdAt: string
}

/** The latest money_ledger rows for a kid, newest first. Empty before migration 030. */
export async function recentLedger(childId: string, limit = 10): Promise<LedgerItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any
  const { data, error } = await admin
    .from('money_ledger')
    .select('id, kind, jar, amount_cents, effective_on, note, created_at')
    .eq('child_id', childId)
    .neq('kind', 'transfer')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  type Row = { id: string; kind: string; jar: Jar | null; amount_cents: number; effective_on: string; note: string | null; created_at: string }
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    jar: r.jar,
    amountCents: r.amount_cents,
    effectiveOn: r.effective_on,
    note: r.note,
    createdAt: r.created_at,
  }))
}

/** Is the family on a paid plan? Drives the goal and store item limits and the money features. */
export async function familyIsPremium(ownerUserId: string): Promise<boolean> {
  try {
    const admin = createServiceRoleClient()
    const { data } = await admin.from('profiles').select('subscription_type').eq('id', ownerUserId).maybeSingle()
    return isPremium(data?.subscription_type)
  } catch {
    return false
  }
}

export interface WalletLimits {
  premium: boolean
  /** Active goals a child may hold at once. */
  goalLimit: number
  /** Store items a family may list. */
  storeItemLimit: number
}

export async function walletLimits(ownerUserId: string): Promise<WalletLimits> {
  const premium = await familyIsPremium(ownerUserId)
  return {
    premium,
    goalLimit: premium ? Number.MAX_SAFE_INTEGER : FREE_GOAL_LIMIT,
    storeItemLimit: premium ? Number.MAX_SAFE_INTEGER : FREE_STORE_ITEM_LIMIT,
  }
}

export interface GoalRow {
  id: string
  child_id: string
  title: string
  emoji: string | null
  target_cents: number
  status: string
  reached_at: string | null
  notified_at: string | null
  created_by: string
  created_at: string
}

export async function activeGoal(childId: string): Promise<GoalRow | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('goals')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as GoalRow | null) ?? null
}

/** Every active goal, oldest first. Premium families can save for several things at once. */
export async function activeGoals(childId: string): Promise<GoalRow[]> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('goals')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  return (data as GoalRow[] | null) ?? []
}

export interface GoalView {
  id: string
  title: string
  emoji: string | null
  targetCents: number
  progressCents: number
  /** 0..100 */
  percent: number
  reached: boolean
  status: string
  reachedAt: string | null
  createdBy: string
}

/**
 * A goal's progress against `owed`: pass Balance.goalBaseCents, which is the
 * Save jar when jars are on and the whole balance when they're off.
 */
export function goalView(goal: GoalRow, owed: number): GoalView {
  const progress = Math.min(owed, goal.target_cents)
  return {
    id: goal.id,
    title: goal.title,
    emoji: goal.emoji,
    targetCents: goal.target_cents,
    progressCents: goal.status === 'reached' ? goal.target_cents : progress,
    percent: goal.status === 'reached' ? 100 : Math.round((progress / goal.target_cents) * 100),
    reached: goal.status === 'reached' || owed >= goal.target_cents,
    status: goal.status,
    reachedAt: goal.reached_at,
    createdBy: goal.created_by,
  }
}
