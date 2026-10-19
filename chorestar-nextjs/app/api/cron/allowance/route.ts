import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/utils/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isPremium } from '@/lib/utils/subscription'
import {
  DEFAULT_MONEY_SETTINGS,
  familyMoneyContext,
  settlePayday,
  type DeductionRow,
  type FamilyMoneyContext,
  type MoneySettingsRow,
  type PaydayResult,
} from '@/lib/utils/money-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/allowance (Vercel Cron, daily; vercel.json)
 *
 * Payday for every kid with a weekly allowance, interest on Save, or a
 * recurring repayment (Premium, migration 030), on the weekday the parent
 * chose, in the family's timezone. Idempotent: each payment is one
 * money_ledger row per kid per week (unique index), so a repeat call, or a
 * catch-up run up to two days after a missed payday, never pays twice.
 * Families that aren't Premium are skipped (their settings are kept).
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // The 030 tables aren't in the generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any

  const [settingsRes, deductionsRes] = await Promise.all([
    admin.from('child_money_settings').select('*').or('allowance_cents.gt.0,interest_bps.gt.0'),
    admin
      .from('money_recurring_deductions')
      .select('id, child_id, title, amount_cents, allow_negative, started_on')
      .eq('is_active', true),
  ])
  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })
  if (deductionsRes.error) return NextResponse.json({ error: deductionsRes.error.message }, { status: 500 })

  const settingsByChild = new Map<string, MoneySettingsRow>(
    ((settingsRes.data ?? []) as MoneySettingsRow[]).map((s) => [s.child_id, s])
  )
  const deductionsByChild = new Map<string, DeductionRow[]>()
  for (const d of (deductionsRes.data ?? []) as DeductionRow[]) {
    const list = deductionsByChild.get(d.child_id) ?? []
    list.push(d)
    deductionsByChild.set(d.child_id, list)
  }

  const childIds = [...new Set([...settingsByChild.keys(), ...deductionsByChild.keys()])]
  if (childIds.length === 0) return NextResponse.json({ children: 0, results: [] })

  const { data: kids } = await admin.from('children').select('id, name, user_id').in('id', childIds)
  const children = (kids ?? []) as Array<{ id: string; name: string; user_id: string }>
  const owners = [...new Set(children.map((k) => k.user_id))]

  // A deduction-only kid still needs a payday: read the settings row if one
  // exists without allowance or interest.
  const missing = children.filter((k) => !settingsByChild.has(k.id)).map((k) => k.id)
  if (missing.length) {
    const { data } = await admin.from('child_money_settings').select('*').in('child_id', missing)
    for (const s of (data ?? []) as MoneySettingsRow[]) settingsByChild.set(s.child_id, s)
  }

  const { data: profiles } = await admin.from('profiles').select('id, subscription_type').in('id', owners)
  const premiumOwners = new Set(
    ((profiles ?? []) as Array<{ id: string; subscription_type: string | null }>)
      .filter((p) => isPremium(p.subscription_type ?? undefined))
      .map((p) => p.id)
  )

  const contexts = new Map<string, FamilyMoneyContext>()
  const now = new Date()
  const results: Array<PaydayResult | { childId: string; result: string }> = []

  for (const child of children) {
    if (!premiumOwners.has(child.user_id)) {
      results.push({ childId: child.id, result: 'skipped-not-premium' })
      continue
    }
    try {
      let ctx = contexts.get(child.user_id)
      if (!ctx) {
        ctx = await familyMoneyContext(child.user_id)
        contexts.set(child.user_id, ctx)
      }
      const settings = settingsByChild.get(child.id) ?? { child_id: child.id, ...DEFAULT_MONEY_SETTINGS }
      const result = await settlePayday(child, settings, deductionsByChild.get(child.id) ?? [], ctx, now)
      if (result.payday) results.push(result)
    } catch (err) {
      console.error('[cron/allowance]', child.id, err)
      results.push({ childId: child.id, result: 'failed' })
    }
  }

  return NextResponse.json({ children: children.length, results })
}
