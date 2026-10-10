import { formatMoney } from '@/lib/constants/currencies'
import { sundayOf } from '@/lib/utils/chore-rotation'

/**
 * The weekly family report email (Premium, opt-in; migration 026). Pure
 * rendering here so weekly-report.test.ts covers it; data gathering and
 * sending live in lib/reports/weekly-report-send.ts.
 */

export interface KidWeek {
  name: string
  /** Approved ticks last week. */
  choresDone: number
  /** Days last week where every due chore was done. */
  perfectDays: number
  /** Days last week with something due. */
  dueDays: number
  earnedCents: number
  /** Current streak of perfect days. */
  streak: number
  goals: { title: string; emoji: string | null; progressCents: number; targetCents: number }[]
}

export interface WeeklyReport {
  familyName: string
  /** e.g. "Oct 4 – Oct 10" */
  weekLabel: string
  currencyCode: string | null
  kids: KidWeek[]
  dashboardUrl: string
  unsubscribeUrl: string
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** One line about a kid's week, in plain words. */
export function kidHeadline(k: KidWeek): string {
  if (k.dueDays > 0 && k.perfectDays === k.dueDays) return `${k.name} finished every day. A perfect week!`
  if (k.perfectDays > 0) return `${k.name} had ${k.perfectDays} perfect ${k.perfectDays === 1 ? 'day' : 'days'}.`
  if (k.choresDone > 0) return `${k.name} checked off ${k.choresDone} ${k.choresDone === 1 ? 'chore' : 'chores'}.`
  return `${k.name} had a quiet week.`
}

export function renderWeeklyReport(r: WeeklyReport): { subject: string; text: string; html: string } {
  const money = (c: number) => formatMoney(c, r.currencyCode)
  const total = r.kids.reduce((s, k) => s + k.earnedCents, 0)
  const subject = `${r.familyName}'s week on ChoreStar: ${r.weekLabel}`

  const kidText = r.kids.map((k) => {
    const lines = [
      kidHeadline(k),
      `  ${k.choresDone} chores done · ${money(k.earnedCents)} earned · ${k.streak}-day streak`,
      ...k.goals.map((g) => `  ${g.emoji ?? '🎯'} ${g.title}: ${money(g.progressCents)} of ${money(g.targetCents)}`),
    ]
    return lines.join('\n')
  })
  const text = [
    `${r.familyName}'s week, ${r.weekLabel}`,
    '',
    ...kidText.flatMap((t) => [t, '']),
    `Earned together: ${money(total)}`,
    '',
    `Open ChoreStar: ${r.dashboardUrl}`,
    '',
    `You get this because the weekly report is on in Settings. Stop it any time: ${r.unsubscribeUrl}`,
  ].join('\n')

  const kidHtml = r.kids
    .map((k) => {
      const goals = k.goals
        .map((g) => {
          const pct = g.targetCents > 0 ? Math.min(100, Math.round((g.progressCents / g.targetCents) * 100)) : 0
          return `<div style="margin-top:8px;font-size:14px;color:#374151">${esc(g.emoji ?? '🎯')} ${esc(g.title)}: <strong>${esc(money(g.progressCents))}</strong> of ${esc(money(g.targetCents))}
            <div style="height:8px;background:#e5e7eb;border-radius:9999px;margin-top:4px"><div style="height:8px;width:${pct}%;background:#6366f1;border-radius:9999px"></div></div></div>`
        })
        .join('')
      return `<div style="padding:16px;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:12px;background:#ffffff">
        <div style="font-size:16px;font-weight:700;color:#111827">${esc(kidHeadline(k))}</div>
        <div style="font-size:14px;color:#4b5563;margin-top:4px">${k.choresDone} chores done · <strong>${esc(money(k.earnedCents))}</strong> earned · ${k.streak}-day streak</div>
        ${goals}
      </div>`
    })
    .join('')
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f3ff;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto">
    <div style="font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.05em">ChoreStar weekly report</div>
    <h1 style="font-size:22px;color:#111827;margin:6px 0 16px">${esc(r.familyName)}'s week, ${esc(r.weekLabel)}</h1>
    ${kidHtml}
    <p style="font-size:15px;color:#111827">Earned together: <strong>${esc(money(total))}</strong></p>
    <p><a href="${esc(r.dashboardUrl)}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700">Open ChoreStar</a></p>
    <p style="font-size:12px;color:#6b7280;margin-top:24px">You get this because the weekly report is on in Settings. <a href="${esc(r.unsubscribeUrl)}" style="color:#6b7280">Stop these emails</a>.</p>
  </div></body></html>`
  return { subject, text, html }
}

/** "Oct 4 – Oct 10" for the week starting on a Sunday (YYYY-MM-DD). */
export function weekLabel(sunday: string): string {
  const start = new Date(`${sunday}T12:00:00Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${f(start)} – ${f(end)}`
}

/** Is it this family's Sunday, with no report sent yet this week? Returns last week's Sunday if so. */
export function reportWeekDue(now: Date, settings: { timezone: string | null; weekly_report_last_sent: string | null }): string | null {
  const tz = settings.timezone || 'UTC'
  const localDow = new Date(now.toLocaleString('en-US', { timeZone: tz })).getDay()
  if (localDow !== 0) return null
  const thisSunday = sundayOf(now, tz)
  if (settings.weekly_report_last_sent && settings.weekly_report_last_sent >= thisSunday) return null
  const d = new Date(`${thisSunday}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}
