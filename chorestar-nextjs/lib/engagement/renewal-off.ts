/**
 * The email a family gets when they turn off Premium renewal in the App Store.
 *
 * Apple tells us the moment it happens (DID_CHANGE_RENEWAL_STATUS /
 * AUTO_RENEW_DISABLED), weeks before the subscription actually ends, and in
 * October 2026 that was the only signal for three cancellations: two of the
 * families had stopped using the app a month earlier and had never touched the
 * Premium features they were paying for. So this is a plain note from Ben,
 * like the other founder emails: nothing changes until the end date, here is
 * one thing included that you have not tried ("before you go, try this"), and reply if something was wrong.
 * Not a discount, not a guilt trip.
 */
import { Resend } from 'resend'
import { FROM, REPLY_TO } from '@/lib/admin/outreach-send'
import { untriedFeatures } from './discovery'
import { loadFamilies } from './usage'

export const RENEWAL_OFF_CAMPAIGN = 'renewal-off'

export function renewalOffEmail(args: {
  untried: { title: string; body: string }[]
  endsOn: Date | null
}): { subject: string; text: string } {
  const ends = args.endsOn
    ? args.endsOn.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
    : null
  const lines = [
    // Not the family name: half of them are "My Family" or "The X Family".
    'Hi there,',
    '',
    ends
      ? `Your ChoreStar Premium is set not to renew, which is completely fine. Everything stays on until ${ends}, and nothing changes before then.`
      : 'Your ChoreStar Premium is set not to renew, which is completely fine. Everything stays on until the end of your current period.',
  ]
  const [first, ...rest] = args.untried
  if (first) {
    lines.push('', `Before you go, try this: ${first.title}. ${first.body}`)
    if (rest.length) lines.push('', `Also included and still waiting for you: ${rest.map((f) => f.title).join(', ')}.`)
  }
  lines.push(
    '',
    'If something was not working for you, or ChoreStar is missing something, I would really like to know. Just reply, it comes straight to me.',
    '',
    'Ben',
    'Founder, ChoreStar',
  )
  return {
    subject: first ? 'Before you go, try this' : ends ? `Your ChoreStar Premium runs until ${ends}` : 'About your ChoreStar Premium',
    text: lines.join('\n'),
  }
}

/**
 * Sends the email once per family (outreach_sent_log), and never throws: a
 * failed email must not make Apple retry a notification whose real work, the
 * audit log, already happened.
 */
export async function sendRenewalOffEmail(
  admin: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string,
  endsOn: Date | null
): Promise<'sent' | 'already-sent' | 'skipped' | 'failed'> {
  try {
    if (!process.env.RESEND_API_KEY) return 'skipped'
    const { data: profile } = await admin.from('profiles').select('email, family_name').eq('id', userId).maybeSingle()
    if (!profile?.email) return 'skipped'

    const { data: prior } = await admin
      .from('outreach_sent_log')
      .select('email')
      .eq('campaign', RENEWAL_OFF_CAMPAIGN)
      .ilike('email', profile.email.replace(/[\\%_]/g, (c: string) => `\\${c}`))
      .limit(1)
    if (prior?.length) return 'already-sent'

    const family = (await loadFamilies(admin, userId)).get(userId)
    const kid = family?.kidName ?? 'your kids'
    // Apple subscribers: only what the iOS app has, and only the Premium
    // features, since those are what renewal pays for.
    const untried = family
      ? untriedFeatures(family.usage, true, 'push').filter((f) => f.premiumOnly).map((f) => f.card(kid))
      : []
    const email = renewalOffEmail({ untried, endsOn })

    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to: profile.email,
      replyTo: REPLY_TO,
      subject: email.subject,
      text: email.text,
    })
    if (result.error) throw new Error(`${result.error.name}: ${result.error.message}`)

    await admin.from('outreach_sent_log').insert({
      campaign: RENEWAL_OFF_CAMPAIGN,
      email: profile.email,
      family_name: profile.family_name,
      resend_id: result.data?.id ?? 'ok',
    })
    return 'sent'
  } catch (err) {
    console.error('[renewal-off]', userId, err)
    return 'failed'
  }
}
