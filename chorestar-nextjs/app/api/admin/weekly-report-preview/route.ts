import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { sundayOf } from '@/lib/utils/chore-rotation'
import { buildFamilyReport, type ReportSettingsRow } from '@/lib/reports/weekly-report-send'

export const dynamic = 'force-dynamic'

/** GET /api/admin/weekly-report-preview?family=<owner id>: last week's report as HTML, never sent. */
export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error
  const family = new URL(request.url).searchParams.get('family')
  if (!family) return new Response('family is required', { status: 400 })
  const admin = createServiceRoleClient() as any
  const { data: s } = await admin
    .from('family_settings')
    .select('user_id, timezone, currency_code, reward_mode, daily_reward_cents, weekly_bonus_cents, weekly_report_token, weekly_report_last_sent')
    .eq('user_id', family)
    .single()
  if (!s) return new Response('no such family', { status: 404 })
  const thisSunday = sundayOf(new Date(), s.timezone || 'UTC')
  const d = new Date(`${thisSunday}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  const report = await buildFamilyReport(admin, s as ReportSettingsRow, d.toISOString().slice(0, 10))
  return new Response(report.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
