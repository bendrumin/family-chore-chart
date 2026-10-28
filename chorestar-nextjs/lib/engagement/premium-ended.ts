/**
 * The email a family gets when Premium ends and the free limits pause some of
 * their kids or chores (lib/billing/plan-limits.ts). The dashboards say the
 * same thing, but only to a family who opens the app, and the families who
 * lapse are mostly the ones who stopped opening it. The first lapse under the
 * limits (October 2026) had 645 chore completions and 25 chores paused
 * overnight; a silent pause reads as data loss.
 *
 * So: what paused, that nothing is deleted, how to get it back, and how to
 * choose what stays on. No discount. Sent at most once a month per family.
 */
import { Resend } from 'resend'
import { FROM, REPLY_TO } from '@/lib/admin/outreach-send'

export const PREMIUM_ENDED_CAMPAIGN = 'premium-ended'
const RESEND_AFTER_DAYS = 30

export function premiumEndedEmail(args: { kids: string[]; chores: number; limits: { kids: number; chores: number } }): { subject: string; text: string } {
  const what = [
    args.kids.length ? args.kids.join(' and ') : null,
    args.chores ? `${args.chores} chore${args.chores === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' and ')
  const lines = [
    'Hi there,',
    '',
    `Your ChoreStar Premium has ended, and the free plan has ${args.limits.kids} kids and ${args.limits.chores} chores, so ${what} ${args.kids.length + args.chores === 1 ? 'is' : 'are'} paused for now.`,
    '',
    'Nothing is deleted. Streaks, history and earnings are all kept, and everything comes back the moment Premium is back on.',
    '',
    'You can also choose which kids and chores stay on: open ChoreStar and tap "Choose what stays on" on the dashboard.',
    '',
    'To resume Premium: in the iPhone app, Settings, then Upgrade to Premium. On the web, chorestar.app, then Settings, then Billing.',
    '',
    'If ChoreStar stopped working for your family, I would really like to know why. Just reply, it comes straight to me.',
    '',
    'Ben',
    'Founder, ChoreStar',
  ]
  return { subject: `${what.charAt(0).toUpperCase()}${what.slice(1)} ${args.kids.length + args.chores === 1 ? 'is' : 'are'} paused, nothing is deleted`, text: lines.join('\n') }
}

/** Never throws: called from onPlanChange inside the stores' webhooks. */
export async function sendPremiumEndedEmail(
  admin: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ownerId: string,
  limits: { kids: number; chores: number }
): Promise<'sent' | 'nothing-paused' | 'recently-sent' | 'skipped' | 'failed'> {
  try {
    if (!process.env.RESEND_API_KEY) return 'skipped'
    const { data: profile } = await admin.from('profiles').select('email, family_name').eq('id', ownerId).maybeSingle()
    if (!profile?.email) return 'skipped'

    const { data: kids } = await admin.from('children').select('id, name, paused_by_plan').eq('user_id', ownerId).order('created_at')
    const all = (kids ?? []) as { id: string; name: string; paused_by_plan: boolean }[]
    const pausedKids = all.filter((k) => k.paused_by_plan)
    const onIds = all.filter((k) => !k.paused_by_plan).map((k) => k.id)
    // Chores of paused kids pause with them; count only the ones on kids who stay.
    const { count } = onIds.length
      ? await admin.from('chores').select('id', { count: 'exact', head: true }).in('child_id', onIds).eq('paused_by_plan', true)
      : { count: 0 }
    const chores = count ?? 0
    if (!pausedKids.length && !chores) return 'nothing-paused'

    const since = new Date(Date.now() - RESEND_AFTER_DAYS * 86_400_000).toISOString()
    const { data: prior } = await admin
      .from('outreach_sent_log')
      .select('email')
      .eq('campaign', PREMIUM_ENDED_CAMPAIGN)
      .ilike('email', profile.email.replace(/[\\%_]/g, (c: string) => `\\${c}`))
      .gte('sent_at', since)
      .limit(1)
    if (prior?.length) return 'recently-sent'

    const email = premiumEndedEmail({ kids: pausedKids.map((k) => k.name.trim().split(/\s+/)[0]), chores, limits })
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to: profile.email,
      replyTo: REPLY_TO,
      subject: email.subject,
      text: email.text,
    })
    if (result.error) throw new Error(`${result.error.name}: ${result.error.message}`)
    await admin.from('outreach_sent_log').insert({
      campaign: PREMIUM_ENDED_CAMPAIGN,
      email: profile.email,
      family_name: profile.family_name,
      resend_id: result.data?.id ?? 'ok',
    })
    return 'sent'
  } catch (err) {
    console.error('[premium-ended]', ownerId, err)
    return 'failed'
  }
}
