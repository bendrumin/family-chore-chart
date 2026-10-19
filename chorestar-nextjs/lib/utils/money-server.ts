import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/constants/currencies'
import { computeBalance, type WalletChild } from '@/lib/utils/wallet'
import { vacationWindowFromSettings } from '@/lib/utils/schedule'
import {
  addDaysYmd,
  allowanceDecision,
  completionRate,
  deductionCents,
  formatRate,
  localDateIn,
  paydayToSettle,
  weekStartOf,
  weeklyInterestCents,
  type Jar,
  type JarSplit,
} from '@/lib/utils/money'

/**
 * Kid money management (Premium, migration 030): the writes. Used by
 * /api/money (parents) and /api/cron/allowance. The math lives in
 * lib/utils/money.ts; balances are derived in lib/utils/wallet.ts.
 *
 * Every table here is written only by the service role (see the migration),
 * so these functions are the only way money moves besides chores and payouts.
 */

// The 030 tables aren't in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

function admin(): Admin {
  return createServiceRoleClient() as Admin
}

export interface FamilyMoneyContext {
  timezone: string
  currency: string
  /** The family_settings row, read loosely (vacation columns aren't typed). */
  settings: Record<string, unknown> | null
}

export async function familyMoneyContext(ownerId: string): Promise<FamilyMoneyContext> {
  const { data } = await admin().from('family_settings').select('*').eq('user_id', ownerId).maybeSingle()
  return {
    timezone: (data?.timezone as string | null) || 'UTC',
    currency: (data?.currency_code as string | null) || 'USD',
    settings: data ?? null,
  }
}

export interface MoneySettingsRow {
  child_id: string
  payday_weekday: number
  allowance_cents: number
  allowance_threshold_pct: number | null
  allowance_started_on: string | null
  interest_bps: number
  interest_started_on: string | null
}

export const DEFAULT_MONEY_SETTINGS: Omit<MoneySettingsRow, 'child_id'> = {
  payday_weekday: 6,
  allowance_cents: 0,
  allowance_threshold_pct: null,
  allowance_started_on: null,
  interest_bps: 0,
  interest_started_on: null,
}

export async function loadMoneySettings(childId: string): Promise<MoneySettingsRow> {
  const { data } = await admin().from('child_money_settings').select('*').eq('child_id', childId).maybeSingle()
  return { child_id: childId, ...DEFAULT_MONEY_SETTINGS, ...(data ?? {}) }
}

export interface LedgerInsert {
  child_id: string
  kind: 'allowance' | 'interest' | 'fine' | 'repayment' | 'donation' | 'transfer'
  jar: Jar | null
  amount_cents: number
  effective_on: string
  period_week?: string | null
  source_key?: string
  note?: string | null
  created_by?: string | null
}

/** Insert ledger rows. 'duplicate' when the weekly unique index says it already happened. */
export async function insertLedger(rows: LedgerInsert[]): Promise<'ok' | 'duplicate' | 'error'> {
  const { error } = await admin().from('money_ledger').insert(rows)
  if (!error) return 'ok'
  if (error.code === '23505') return 'duplicate'
  console.error('[money] ledger insert failed:', error.message)
  return 'error'
}

// ---------------------------------------------------------------------------
// Jars
// ---------------------------------------------------------------------------

/**
 * Turn jars on (or change the split) from today, or off. Turning them off
 * moves whatever is in Save and Give back into Spend with transfer rows, so
 * the kid's money becomes one balance again and nothing is hidden in a jar
 * they can't see. History before today keeps the split it was earned under.
 */
export async function saveJarSplit(
  child: WalletChild,
  enabled: boolean,
  split: JarSplit,
  actor: string,
  today: string
): Promise<boolean> {
  if (!enabled) {
    const before = await computeBalance(child, { premium: true })
    const rows: LedgerInsert[] = []
    for (const jar of ['save', 'give'] as const) {
      const cents = jar === 'save' ? before.jars.saveCents : before.jars.giveCents
      if (!before.jars.enabled || cents === 0) continue
      const note = `Jars turned off: ${jar === 'save' ? 'Save' : 'Give'} moved to Spend`
      rows.push(
        { child_id: child.id, kind: 'transfer', jar, amount_cents: -cents, effective_on: today, note, created_by: actor },
        { child_id: child.id, kind: 'transfer', jar: 'spend', amount_cents: cents, effective_on: today, note, created_by: actor }
      )
    }
    if (rows.length && (await insertLedger(rows)) === 'error') return false
  }

  const { error } = await admin()
    .from('money_jar_splits')
    .insert({
      child_id: child.id,
      enabled,
      spend_pct: enabled ? split.spend : 100,
      save_pct: enabled ? split.save : 0,
      give_pct: enabled ? split.give : 0,
      effective_on: today,
      created_by: actor,
    })
  if (error) console.error('[money] split insert failed:', error.message)
  return !error
}

// ---------------------------------------------------------------------------
// Payday (the cron)
// ---------------------------------------------------------------------------

export interface DeductionRow {
  id: string
  child_id: string
  title: string
  amount_cents: number
  allow_negative: boolean
  started_on: string
}

export interface PaydayResult {
  childId: string
  payday: string | null
  interest?: string
  allowance?: string
  repayments?: string[]
}

/** The share of chores done in the 7 days before payday, for the allowance threshold. */
async function rateBeforePayday(child: WalletChild, payday: string, ctx: FamilyMoneyContext) {
  const db = admin()
  const from = addDaysYmd(payday, -7)
  const to = addDaysYmd(payday, -1)
  const { data: chores } = await db
    .from('chores')
    .select('id, days_of_week')
    .eq('child_id', child.id)
    .eq('is_active', true)
  const list = (chores ?? []) as Array<{ id: string; days_of_week: number[] | null }>
  const { data: completions } = list.length
    ? await db
        .from('chore_completions')
        .select('chore_id, week_start, day_of_week, status')
        .in('chore_id', list.map((c) => c.id))
        .gte('week_start', weekStartOf(from))
        .lte('week_start', weekStartOf(to))
    : { data: [] }
  const vacation = vacationWindowFromSettings(ctx.settings)
  return completionRate(list, completions ?? [], from, to, vacation ? [vacation] : null)
}

/**
 * Settle one kid's payday: interest on Save, then the weekly allowance, then
 * recurring repayments (after the allowance, so it can cover them). Each is
 * one money_ledger row per week (unique index), so running this again the
 * same week, or catching up a day late, never pays twice.
 */
export async function settlePayday(
  child: WalletChild,
  settings: MoneySettingsRow,
  deductions: DeductionRow[],
  ctx: FamilyMoneyContext,
  now: Date
): Promise<PaydayResult> {
  const today = localDateIn(now, ctx.timezone)
  const payday = paydayToSettle(today, settings.payday_weekday)
  const result: PaydayResult = { childId: child.id, payday }
  if (!payday) return result

  const week = weekStartOf(payday)
  const { data: existingRows } = await admin()
    .from('money_ledger')
    .select('kind, source_key')
    .eq('child_id', child.id)
    .eq('period_week', week)
  const done = new Set(((existingRows ?? []) as Array<{ kind: string; source_key: string }>).map((r) => `${r.kind}|${r.source_key}`))
  const money = (c: number) => formatMoney(c, ctx.currency)

  // 1. Interest on what was saved, before this week's allowance lands.
  const interestStarted = !settings.interest_started_on || payday >= settings.interest_started_on
  if (settings.interest_bps > 0 && interestStarted && !done.has('interest|')) {
    const balance = await computeBalance(child, { premium: true })
    if (!balance.jars.enabled) {
      result.interest = 'skipped-no-jars'
    } else {
      const cents = weeklyInterestCents(balance.jars.saveCents, settings.interest_bps)
      if (cents > 0) {
        result.interest = await insertLedger([
          {
            child_id: child.id,
            kind: 'interest',
            jar: 'save',
            amount_cents: cents,
            effective_on: payday,
            period_week: week,
            note: `${formatRate(settings.interest_bps)} interest on ${money(balance.jars.saveCents)} saved`,
          },
        ])
      } else {
        result.interest = 'nothing-saved'
      }
    }
  }

  // 2. Weekly allowance, split into jars like any income.
  const allowanceStarted = !settings.allowance_started_on || payday >= settings.allowance_started_on
  if (settings.allowance_cents > 0 && allowanceStarted && !done.has('allowance|')) {
    const rate = settings.allowance_threshold_pct
      ? await rateBeforePayday(child, payday, ctx)
      : { due: 0, done: 0, percent: null }
    const decision = allowanceDecision(settings.allowance_cents, settings.allowance_threshold_pct, rate)
    result.allowance = await insertLedger([
      {
        child_id: child.id,
        kind: 'allowance',
        jar: null,
        amount_cents: decision.cents,
        effective_on: payday,
        period_week: week,
        note: decision.note,
      },
    ])
    if (result.allowance === 'ok' && !decision.paid) result.allowance = 'skipped-threshold'
  }

  // 3. Recurring repayments, from Spend, never below zero unless allowed.
  const due = deductions.filter((d) => payday >= d.started_on && !done.has(`repayment|${d.id}`))
  if (due.length) {
    result.repayments = []
    for (const d of due) {
      const balance = await computeBalance(child, { premium: true })
      const cents = deductionCents(d.amount_cents, balance.jars.spendCents, d.allow_negative)
      const note =
        cents < d.amount_cents
          ? `${d.title}: ${money(cents)} of ${money(d.amount_cents)} (not enough in Spend)`
          : d.title
      result.repayments.push(
        await insertLedger([
          {
            child_id: child.id,
            kind: 'repayment',
            jar: 'spend',
            amount_cents: -cents,
            effective_on: payday,
            period_week: week,
            source_key: d.id,
            note,
          },
        ])
      )
    }
  }

  return result
}
