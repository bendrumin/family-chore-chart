import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import {
  computeBalance,
  computeMinutes,
  familyIsPremium,
  loadChild,
  recentLedger,
  type WalletChild,
} from '@/lib/utils/wallet'
import {
  familyMoneyContext,
  insertLedger,
  loadMoneySettings,
  saveJarSplit,
  type FamilyMoneyContext,
} from '@/lib/utils/money-server'
import {
  DEDUCTION_MAX_CENTS,
  INTEREST_MAX_BPS,
  MINUTES_MAX_PER_REWARD,
  currentVersion,
  isValidSplit,
  localDateIn,
  nextPayday,
  type MoneyFeature,
} from '@/lib/utils/money'

/**
 * Kid money management for parents (Premium, migration 030).
 *
 * GET  /api/money?familyId=...   every kid's jars, allowance, interest,
 *                                repayments, minutes and latest money news
 * POST /api/money { action, ... } one change (see `bodySchema`)
 *
 * Auth: web session or iOS Bearer token; the caller must own the family or be
 * a co-parent in it. Writes go through the service role (the 030 tables have
 * no app-session write policies). Switching something ON needs Premium and
 * answers 403 { error: 'premium_required', feature } otherwise; switching
 * things OFF (jars, allowance, interest, a repayment, minutes) never does, so
 * a lapsed family can always stop them.
 */

// The 030 tables and columns aren't in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

const uuid = z.string().uuid()
const cents = z.number().int().min(1).max(DEDUCTION_MAX_CENTS)

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('jars'),
    childId: uuid,
    enabled: z.boolean(),
    spend: z.number().int().min(0).max(100),
    save: z.number().int().min(0).max(100),
    give: z.number().int().min(0).max(100),
  }),
  z.object({
    action: z.literal('schedule'),
    childId: uuid,
    paydayWeekday: z.number().int().min(0).max(6),
    allowanceCents: z.number().int().min(0).max(100_000),
    thresholdPct: z.number().int().min(1).max(100).nullable(),
    interestBps: z.number().int().min(0).max(INTEREST_MAX_BPS),
  }),
  z.object({
    action: z.literal('fine'),
    childId: uuid,
    amountCents: cents,
    reason: z.string().trim().min(1).max(100),
    allowNegative: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('donation'),
    childId: uuid,
    amountCents: cents,
    note: z.string().trim().min(1).max(100),
  }),
  z.object({
    action: z.literal('repayment'),
    childId: uuid,
    title: z.string().trim().min(1).max(60),
    amountCents: cents,
    allowNegative: z.boolean().default(false),
  }),
  z.object({ action: z.literal('repayment-stop'), childId: uuid, repaymentId: uuid }),
  z.object({
    action: z.literal('minutes-use'),
    childId: uuid,
    minutes: z.number().int().min(1).max(MINUTES_MAX_PER_REWARD),
    note: z.string().trim().max(100).optional(),
  }),
  z.object({
    action: z.literal('minutes-reward'),
    childId: uuid,
    target: z.enum(['chore', 'routine']),
    id: uuid,
    minutes: z.number().int().min(0).max(MINUTES_MAX_PER_REWARD),
  }),
])

function premiumRequired(feature: MoneyFeature) {
  return NextResponse.json({ error: 'premium_required', feature }, { status: 403 })
}

async function authorize(request: Request, childId: string) {
  const userId = await getParentUserId(request)
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const child = await loadChild(childId)
  if (!child) return { error: NextResponse.json({ error: 'Child not found' }, { status: 404 }) }
  const families = await familiesForUser(userId)
  if (!families.includes(child.user_id)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { userId, child }
}

async function kidMoney(child: WalletChild, premium: boolean, ctx: FamilyMoneyContext) {
  const db: Admin = createServiceRoleClient()
  const today = localDateIn(new Date(), ctx.timezone)
  const [balance, minutes, ledger, settings, splitsRes, deductionsRes, choresRes, routinesRes] = await Promise.all([
    computeBalance(child, { premium }),
    computeMinutes(child.id),
    recentLedger(child.id, 12),
    loadMoneySettings(child.id),
    db.from('money_jar_splits').select('enabled, spend_pct, save_pct, give_pct, effective_on, created_at').eq('child_id', child.id),
    db
      .from('money_recurring_deductions')
      .select('id, title, amount_cents, allow_negative, started_on')
      .eq('child_id', child.id)
      .eq('is_active', true)
      .order('created_at'),
    db.from('chores').select('id, name, reward_cents, reward_minutes').eq('child_id', child.id).eq('is_active', true).order('created_at'),
    db.from('routines').select('id, name, reward_minutes').eq('child_id', child.id).eq('is_active', true).order('created_at'),
  ])
  type SplitRow = { enabled: boolean; spend_pct: number; save_pct: number; give_pct: number; effective_on: string; created_at: string }
  const current = currentVersion(
    ((splitsRes.data ?? []) as SplitRow[]).map((r) => ({
      enabled: r.enabled,
      spend: r.spend_pct,
      save: r.save_pct,
      give: r.give_pct,
      effectiveOn: r.effective_on,
      createdAt: r.created_at,
    }))
  )
  type Deduction = { id: string; title: string; amount_cents: number; allow_negative: boolean; started_on: string }
  type Item = { id: string; name: string; reward_cents?: number; reward_minutes?: number }
  return {
    childId: child.id,
    name: child.name,
    balance,
    // The split the parent last chose, even while jars are off, so the
    // editor reopens on it.
    split: current ? { enabled: current.enabled, spend: current.spend, save: current.save, give: current.give } : null,
    schedule: {
      paydayWeekday: settings.payday_weekday,
      nextPayday: nextPayday(today, settings.payday_weekday),
      allowanceCents: settings.allowance_cents,
      thresholdPct: settings.allowance_threshold_pct,
      interestBps: settings.interest_bps,
    },
    repayments: ((deductionsRes.data ?? []) as Deduction[]).map((d) => ({
      id: d.id,
      title: d.title,
      amountCents: d.amount_cents,
      allowNegative: d.allow_negative,
      startedOn: d.started_on,
    })),
    minutes: {
      balance: minutes.balanceMinutes,
      earned: minutes.earnedMinutes,
      used: minutes.usedMinutes,
      chores: ((choresRes.data ?? []) as Item[]).map((c) => ({ id: c.id, name: c.name, rewardCents: c.reward_cents ?? 0, minutes: c.reward_minutes ?? 0 })),
      routines: ((routinesRes.data ?? []) as Item[]).map((r) => ({ id: r.id, name: r.name, minutes: r.reward_minutes ?? 0 })),
      // False until migration 030 adds the columns.
      available: !choresRes.error,
    },
    ledger,
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getParentUserId(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const familyId = new URL(request.url).searchParams.get('familyId') ?? userId
    if (!/^[0-9a-f-]{36}$/i.test(familyId)) return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    const families = await familiesForUser(userId)
    if (!families.includes(familyId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db: Admin = createServiceRoleClient()
    const [premium, ctx, kidsRes, migrationCheck] = await Promise.all([
      familyIsPremium(familyId),
      familyMoneyContext(familyId),
      db.from('children').select('id, name, user_id').eq('user_id', familyId).order('created_at'),
      db.from('child_money_settings').select('child_id').limit(1),
    ])
    const kids = (kidsRes.data ?? []) as WalletChild[]

    return NextResponse.json(
      {
        premium,
        currencyCode: ctx.currency,
        timezone: ctx.timezone,
        // Migration 030 not applied yet: the UI says so instead of failing.
        ready: !migrationCheck.error,
        kids: premium ? await Promise.all(kids.map((k) => kidMoney(k, premium, ctx))) : kids.map((k) => ({ childId: k.id, name: k.name })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[money] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const body = parsed.data

  try {
    const auth = await authorize(request, body.childId)
    if ('error' in auth) return auth.error
    const { userId, child } = auth
    const db: Admin = createServiceRoleClient()
    const [premium, ctx] = await Promise.all([familyIsPremium(child.user_id), familyMoneyContext(child.user_id)])
    const today = localDateIn(new Date(), ctx.timezone)

    switch (body.action) {
      case 'jars': {
        if (body.enabled && !premium) return premiumRequired('jars')
        const split = { spend: body.spend, save: body.save, give: body.give }
        if (body.enabled && !isValidSplit(split)) {
          return NextResponse.json({ error: 'The three jars must add up to 100%' }, { status: 400 })
        }
        if (!(await saveJarSplit(child, body.enabled, split, userId, today))) {
          return NextResponse.json({ error: 'Could not save the jars' }, { status: 500 })
        }
        break
      }

      case 'schedule': {
        if (body.allowanceCents > 0 && !premium) return premiumRequired('allowance')
        if (body.interestBps > 0 && !premium) return premiumRequired('interest')
        const before = await loadMoneySettings(child.id)
        const paydayMoved = before.payday_weekday !== body.paydayWeekday
        // Started-on dates keep a payday that already went by this week from
        // being paid the moment something is switched on or moved.
        const row = {
          child_id: child.id,
          payday_weekday: body.paydayWeekday,
          allowance_cents: body.allowanceCents,
          allowance_threshold_pct: body.thresholdPct,
          allowance_started_on:
            body.allowanceCents > 0 && (before.allowance_cents === 0 || paydayMoved || !before.allowance_started_on)
              ? today
              : before.allowance_started_on,
          interest_bps: body.interestBps,
          interest_started_on:
            body.interestBps > 0 && (before.interest_bps === 0 || paydayMoved || !before.interest_started_on)
              ? today
              : before.interest_started_on,
          updated_at: new Date().toISOString(),
        }
        const { error } = await db.from('child_money_settings').upsert(row, { onConflict: 'child_id' })
        if (error) {
          console.error('[money] schedule upsert failed:', error.message)
          return NextResponse.json({ error: 'Could not save' }, { status: 500 })
        }
        break
      }

      case 'fine': {
        if (!premium) return premiumRequired('fines')
        const balance = await computeBalance(child, { premium })
        const spend = balance.jars.spendCents
        if (!body.allowNegative && body.amountCents > Math.max(0, spend)) {
          return NextResponse.json(
            { error: 'not_enough', availableCents: Math.max(0, spend) },
            { status: 409 }
          )
        }
        const result = await insertLedger([
          {
            child_id: child.id,
            kind: 'fine',
            jar: 'spend',
            amount_cents: -body.amountCents,
            effective_on: today,
            note: body.reason,
            created_by: userId,
          },
        ])
        if (result !== 'ok') return NextResponse.json({ error: 'Could not record that' }, { status: 500 })
        break
      }

      case 'donation': {
        if (!premium) return premiumRequired('jars')
        const balance = await computeBalance(child, { premium })
        if (!balance.jars.enabled) {
          return NextResponse.json({ error: 'Turn on the jars to track giving' }, { status: 400 })
        }
        if (body.amountCents > Math.max(0, balance.jars.giveCents)) {
          return NextResponse.json(
            { error: 'not_enough', availableCents: Math.max(0, balance.jars.giveCents) },
            { status: 409 }
          )
        }
        const result = await insertLedger([
          {
            child_id: child.id,
            kind: 'donation',
            jar: 'give',
            amount_cents: -body.amountCents,
            effective_on: today,
            note: body.note,
            created_by: userId,
          },
        ])
        if (result !== 'ok') return NextResponse.json({ error: 'Could not record that' }, { status: 500 })
        break
      }

      case 'repayment': {
        if (!premium) return premiumRequired('fines')
        const { error } = await db.from('money_recurring_deductions').insert({
          child_id: child.id,
          title: body.title,
          amount_cents: body.amountCents,
          allow_negative: body.allowNegative,
          started_on: today,
          created_by: userId,
        })
        if (error) {
          console.error('[money] repayment insert failed:', error.message)
          return NextResponse.json({ error: 'Could not save' }, { status: 500 })
        }
        break
      }

      case 'repayment-stop': {
        const { error } = await db
          .from('money_recurring_deductions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', body.repaymentId)
          .eq('child_id', child.id)
        if (error) return NextResponse.json({ error: 'Could not stop it' }, { status: 500 })
        break
      }

      case 'minutes-use': {
        if (!premium) return premiumRequired('minutes')
        const minutes = await computeMinutes(child.id)
        if (body.minutes > minutes.balanceMinutes) {
          return NextResponse.json(
            { error: 'not_enough', availableMinutes: Math.max(0, minutes.balanceMinutes) },
            { status: 409 }
          )
        }
        const { error } = await db.from('screen_minutes_ledger').insert({
          child_id: child.id,
          kind: 'used',
          amount_minutes: -body.minutes,
          note: body.note || null,
          created_by: userId,
        })
        if (error) return NextResponse.json({ error: 'Could not record that' }, { status: 500 })
        break
      }

      case 'minutes-reward': {
        if (body.minutes > 0 && !premium) return premiumRequired('minutes')
        const table = body.target === 'chore' ? 'chores' : 'routines'
        const { data, error } = await db
          .from(table)
          .update({ reward_minutes: body.minutes })
          .eq('id', body.id)
          .eq('child_id', child.id)
          .select('id')
        if (error || !data?.length) return NextResponse.json({ error: 'Could not save' }, { status: error ? 500 : 404 })
        break
      }
    }

    const ctxKid = await kidMoney(child, premium, ctx)
    return NextResponse.json({ ok: true, kid: ctxKid })
  } catch (error) {
    console.error('[money] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
