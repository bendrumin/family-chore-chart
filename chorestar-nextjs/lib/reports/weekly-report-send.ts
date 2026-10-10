import type { SupabaseClient } from '@supabase/supabase-js'
import { childWeekEarningsCents, type EarningsSettings } from '@/lib/utils/earnings'
import { computeStreaks } from '@/lib/utils/streak'
import { activeGoals, computeBalance, goalView } from '@/lib/utils/wallet'
import { renderWeeklyReport, weekLabel, type KidWeek } from './weekly-report'
export { reportWeekDue } from './weekly-report'

export interface ReportSettingsRow extends EarningsSettings {
  user_id: string
  timezone: string | null
  currency_code: string | null
  weekly_report_token: string
  weekly_report_last_sent: string | null
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Last week's numbers for one family, rendered. `week` is that week's Sunday. */
export async function buildFamilyReport(admin: SupabaseClient, settings: ReportSettingsRow, week: string) {
  const db = admin as any
  const { data: profile } = await db.from('profiles').select('family_name, email').eq('id', settings.user_id).single()
  const { data: kids } = await db.from('children').select('id, name, user_id').eq('user_id', settings.user_id).order('created_at')

  const kidWeeks: KidWeek[] = []
  for (const kid of kids ?? []) {
    const { data: chores } = await db
      .from('chores')
      .select('id, reward_cents, days_of_week')
      .eq('child_id', kid.id)
      .or('is_active.eq.true,rotation_group_id.not.is.null')
    const choreIds = (chores ?? []).map((c: { id: string }) => c.id)
    const { data: completions } = choreIds.length
      ? await db.from('chore_completions').select('chore_id, day_of_week, week_start, status').in('chore_id', choreIds)
      : { data: [] }
    const all = completions ?? []
    const lastWeek = all.filter((c: { week_start: string | null }) => c.week_start === week)
    const earnings = childWeekEarningsCents(chores ?? [], lastWeek, settings)
    const streaks = computeStreaks(chores ?? [], all, { weekStart: addDays(week, 7), dayOfWeek: 0 })
    const balance = await computeBalance(kid)
    const goals = (await activeGoals(kid.id)).map((g) => goalView(g, balance.owedCents))
    kidWeeks.push({
      name: kid.name,
      choresDone: lastWeek.filter((c: { status?: string | null }) => !c.status || c.status === 'approved').length,
      perfectDays: earnings.perfectDays,
      dueDays: earnings.dueDays,
      earnedCents: earnings.earnedCents,
      streak: streaks.current,
      goals: goals.map((g) => ({ title: g.title, emoji: g.emoji, progressCents: g.progressCents, targetCents: g.targetCents })),
    })
  }

  return {
    to: profile?.email as string | undefined,
    ...renderWeeklyReport({
      familyName: profile?.family_name || 'Your family',
      weekLabel: weekLabel(week),
      currencyCode: settings.currency_code,
      kids: kidWeeks,
      dashboardUrl: 'https://chorestar.app/dashboard',
      unsubscribeUrl: `https://chorestar.app/api/reports/weekly/unsubscribe?t=${settings.weekly_report_token}`,
    }),
  }
}
