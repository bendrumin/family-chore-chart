import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { familyIsPremium } from '@/lib/utils/wallet'
import { sundayOf } from '@/lib/utils/chore-rotation'
import { buildFamilyReport, reportWeekDue, type ReportSettingsRow } from '@/lib/reports/weekly-report-send'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/weekly-report (Vercel Cron, daily; vercel.json)
 *
 * Sends last week's family report to opted-in Premium families whose local
 * day is Sunday, once per week. Opt-in only (migration 026); a family that
 * isn't Premium anymore is skipped, not unsubscribed.
 */
export async function GET() {
  const admin = createServiceRoleClient() as any
  const { data: families, error } = await admin
    .from('family_settings')
    .select('user_id, timezone, currency_code, reward_mode, daily_reward_cents, weekly_bonus_cents, weekly_report_token, weekly_report_last_sent')
    .eq('weekly_report_email', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const now = new Date()
  const results: { family: string; result: string }[] = []
  for (const s of (families ?? []) as ReportSettingsRow[]) {
    const week = reportWeekDue(now, s)
    if (!week) continue
    if (!(await familyIsPremium(s.user_id))) {
      results.push({ family: s.user_id, result: 'skipped-not-premium' })
      continue
    }
    try {
      const report = await buildFamilyReport(admin, s, week)
      if (!report.to) throw new Error('no email')
      await resend.emails.send({
        from: 'ChoreStar <hi@chorestar.app>',
        to: report.to,
        replyTo: 'hi@chorestar.app',
        subject: report.subject,
        text: report.text,
        html: report.html,
        headers: { 'List-Unsubscribe': `<https://chorestar.app/api/reports/weekly/unsubscribe?t=${s.weekly_report_token}>` },
      })
      await admin.from('family_settings').update({ weekly_report_last_sent: sundayOf(now, s.timezone || 'UTC') }).eq('user_id', s.user_id)
      results.push({ family: s.user_id, result: 'sent' })
    } catch (err) {
      console.error('[weekly-report]', s.user_id, err)
      results.push({ family: s.user_id, result: 'failed' })
    }
  }
  return NextResponse.json({ optedIn: (families ?? []).length, results })
}
