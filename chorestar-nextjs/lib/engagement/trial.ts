/**
 * Check-ins during the 7-day free trial (lib/billing/trial.ts).
 *
 * The first monthly trial started on October 28, 2026, from a family who set
 * up a kid, nine chores, a routine and a PIN within 16 minutes of signing up,
 * and then checked off one chore. What decides whether a trial converts is
 * whether the kids are using it by the end of the week, so the week has three
 * touches, each sent once:
 *
 *   - day 1, push: get the kid going (their own PIN first, then one Premium
 *     feature they have not tried)
 *   - day 3, email: what the family has done so far and two things to try
 *   - 2 days before the end, push and email: an honest "your free week ends on
 *     <date>", what Premium has been doing for them, and how to cancel. Only
 *     while renewal is on: a family who switched it off already gets the
 *     "before you go" email (renewal-off.ts) at the same point.
 *
 * Who is in a trial: Apple, a SUBSCRIBED notification whose period is 8 days
 * or less (no paid plan is that short) and nothing renewed or expired since;
 * Stripe, a subscription in `trialing`. Google Play has no trial yet.
 *
 * The pure parts (trialFromApple, trialStepDue, the copy) are covered by
 * trial.test.ts.
 */
import { Resend } from 'resend'
import type Stripe from 'stripe'
import { FROM, REPLY_TO } from '@/lib/admin/outreach-send'
import { FEATURES, cardCopy, nextFeature, untriedFeatures, type CopyLang, type FamilyUsage } from './discovery'
import { fetchAll, loadFamilies, type FamilyData } from './usage'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

const DAY_MS = 86_400_000
/** Longest period that can only be a trial: 7 days plus Apple's rounding. */
const TRIAL_MAX_DAYS = 8
/** The ending note goes out this close to the end. */
export const TRIAL_ENDING_DAYS = 2

export type TrialRail = 'apple' | 'stripe'
export type TrialStep = 'trial-day1' | 'trial-day3' | 'trial-ending'
export const TRIAL_STEPS: TrialStep[] = ['trial-day1', 'trial-day3', 'trial-ending']

export interface Trial {
  ownerId: string
  rail: TrialRail
  startedAt: Date
  endsAt: Date
  /** False once the family has switched renewal off. */
  renewing: boolean
}

export interface AppleRow {
  user_id: string
  notification_type: string
  subtype: string | null
  expires_at: string | null
  created_at: string
}

/**
 * One family's Apple notifications, in any order, to their current trial or
 * null. A trial starts with SUBSCRIBED and a short period; a later DID_RENEW
 * (converted) or EXPIRED (ended) closes it.
 */
export function trialFromApple(rows: AppleRow[], now: Date): Omit<Trial, 'ownerId' | 'rail'> | null {
  const sorted = [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  let trial: { startedAt: Date; endsAt: Date; renewing: boolean } | null = null
  for (const r of sorted) {
    if (r.notification_type === 'SUBSCRIBED' && r.expires_at) {
      const start = new Date(r.created_at)
      const end = new Date(r.expires_at)
      const short = end.getTime() - start.getTime() <= TRIAL_MAX_DAYS * DAY_MS
      trial = short ? { startedAt: start, endsAt: end, renewing: true } : null
    } else if (!trial) {
      continue
    } else if (r.notification_type === 'DID_RENEW' || r.notification_type === 'EXPIRED' || r.notification_type === 'REFUND' || r.notification_type === 'REVOKE') {
      trial = null
    } else if (r.notification_type === 'DID_CHANGE_RENEWAL_STATUS') {
      trial.renewing = r.subtype !== 'AUTO_RENEW_DISABLED'
    }
  }
  if (!trial || trial.endsAt <= now) return null
  return trial
}

/** The next check-in this trial is due, or null. At most one per run. */
export function trialStepDue(trial: Pick<Trial, 'startedAt' | 'endsAt' | 'renewing'>, now: Date, sent: Set<TrialStep>): TrialStep | null {
  const age = (now.getTime() - trial.startedAt.getTime()) / DAY_MS
  const left = (trial.endsAt.getTime() - now.getTime()) / DAY_MS
  if (left <= 0) return null
  if (left <= TRIAL_ENDING_DAYS) return trial.renewing && !sent.has('trial-ending') ? 'trial-ending' : null
  if (age >= 3) return sent.has('trial-day3') ? null : 'trial-day3'
  if (age >= 1) return sent.has('trial-day1') || sent.has('trial-day3') ? null : 'trial-day1'
  return null
}

/** Day of the free week, 1 to 7. */
export function trialDay(startedAt: Date, now: Date): number {
  return Math.min(7, Math.max(1, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS) + 1))
}

/** Premium features this family has already used, by card title. */
export function premiumUsed(usage: FamilyUsage, lang: CopyLang = 'en'): string[] {
  return FEATURES.filter((f) => f.premiumOnly && f.tried(usage)).map((f) => cardCopy(f, '', lang).title)
}

export function dayOneTrialPush(kid: string, usage: FamilyUsage): { title: string; body: string } {
  if (!usage.hasPin) {
    return {
      title: `Hand ${kid} the checklist`,
      body: `Set a 4-digit PIN and ${kid} can check off chores on any device, no email needed.`,
    }
  }
  const feature = nextFeature(usage, true, 'push')
  if (feature) return feature.push(kid)
  return { title: `How is ${kid}'s first day going?`, body: 'Every chore checked off today counts toward their streak.' }
}

export interface TrialStats {
  choresDone: number
  routinesDone: number
}

function statsLine(s: TrialStats): string | null {
  const parts: string[] = []
  if (s.choresDone) parts.push(`${s.choresDone} chore${s.choresDone === 1 ? '' : 's'} checked off`)
  if (s.routinesDone) parts.push(`${s.routinesDone} routine${s.routinesDone === 1 ? '' : 's'} finished`)
  return parts.length ? parts.join(' and ') : null
}

const longDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

const SIGN_OFF = ['', 'If anything is confusing, or ChoreStar is missing something, just reply. It comes straight to me.', '', 'Ben', 'Founder, ChoreStar']

export function dayThreeTrialEmail(args: {
  kid: string
  stats: TrialStats
  untried: { title: string; body: string }[]
  endsAt: Date
}): { subject: string; text: string } {
  const done = statsLine(args.stats)
  const lines = [
    'Hi there,',
    '',
    done
      ? `You are a few days into your free week of ChoreStar Premium, and so far: ${done}. Nice start.`
      : `You are a few days into your free week of ChoreStar Premium. Nothing has been checked off yet, and the quickest way to start is to let ${args.kid} do it: set a 4-digit PIN on their profile and they sign in at chorestar.app/kid-login with your family code.`,
  ]
  const tries = args.untried.slice(0, 2)
  if (tries.length) {
    lines.push('', tries.length === 1 ? 'One thing worth trying before the week is up:' : 'Two things worth trying before the week is up:', '')
    for (const t of tries) lines.push(`- ${t.title}. ${t.body}`)
  }
  lines.push('', `Your free week runs until ${longDate(args.endsAt)}.`, ...SIGN_OFF)
  return { subject: 'Your first days with ChoreStar Premium', text: lines.join('\n') }
}

export function endingTrialPush(endsAt: Date): { title: string; body: string } {
  const day = endsAt.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  return { title: `Your free week ends ${day}`, body: 'Premium carries on after that. To cancel instead, do it before then.' }
}

export function endingTrialEmail(args: {
  rail: TrialRail
  stats: TrialStats
  used: string[]
  wouldPause: { kids: string[]; chores: number }
  endsAt: Date
}): { subject: string; text: string } {
  const ends = longDate(args.endsAt)
  const done = statsLine(args.stats)
  const lines = [
    'Hi there,',
    '',
    `A heads-up so nothing comes as a surprise: your free week of ChoreStar Premium ends on ${ends}, and your subscription starts then.`,
  ]
  if (done) lines.push('', `This week: ${done}.`)
  if (args.used.length) lines.push('', `Premium you have been using: ${args.used.join(', ')}.`)
  const { kids, chores } = args.wouldPause
  if (kids.length || chores) {
    const what = [kids.length ? kids.join(' and ') : null, chores ? `${chores} chore${chores === 1 ? '' : 's'}` : null].filter(Boolean).join(' and ')
    lines.push('', `Premium is also what keeps everyone on: the free plan has 3 kids and 20 chores, so without it ${what} would pause.`)
  }
  lines.push(
    '',
    'To keep Premium, there is nothing to do.',
    args.rail === 'apple'
      ? `To cancel, do it before ${ends}: on your iPhone, open Settings, tap your name, then Subscriptions.`
      : `To cancel, do it before ${ends}: in ChoreStar, open Settings, then Billing, then Manage subscription.`,
    ...SIGN_OFF,
  )
  return { subject: `Your free week ends ${args.endsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`, text: lines.join('\n') }
}

// ---------------------------------------------------------------------------
// Loading (service role)

const APPLE_TYPES = ['SUBSCRIBED', 'DID_RENEW', 'EXPIRED', 'REFUND', 'REVOKE', 'DID_CHANGE_RENEWAL_STATUS']

async function appleTrials(admin: Admin, now: Date, onlyOwner?: string): Promise<Trial[]> {
  const since = new Date(now.getTime() - (TRIAL_MAX_DAYS + 1) * DAY_MS).toISOString()
  const rows = await fetchAll<AppleRow>((from, to) => {
    let q = admin
      .from('apple_notifications')
      .select('user_id, notification_type, subtype, expires_at, created_at')
      .eq('environment', 'Production')
      .not('user_id', 'is', null)
      .in('notification_type', APPLE_TYPES)
      .gte('created_at', since)
      .range(from, to)
    if (onlyOwner) q = q.eq('user_id', onlyOwner)
    return q
  })
  const byUser = new Map<string, AppleRow[]>()
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r])
  const out: Trial[] = []
  for (const [ownerId, list] of byUser) {
    const t = trialFromApple(list, now)
    if (t) out.push({ ownerId, rail: 'apple', ...t })
  }
  return out
}

function fromStripe(sub: Stripe.Subscription, ownerId: string): Trial | null {
  if (sub.status !== 'trialing' || !sub.trial_start || !sub.trial_end) return null
  return {
    ownerId,
    rail: 'stripe',
    startedAt: new Date(sub.trial_start * 1000),
    endsAt: new Date(sub.trial_end * 1000),
    renewing: !sub.cancel_at_period_end && !sub.cancel_at,
  }
}

async function stripeTrials(admin: Admin, stripe: Stripe | null, onlyOwner?: string): Promise<Trial[]> {
  if (!stripe) return []
  try {
    if (onlyOwner) {
      const found = await stripe.subscriptions.search({ query: `status:'trialing' AND metadata['userId']:'${onlyOwner}'`, limit: 1 })
      const t = found.data[0] && fromStripe(found.data[0], onlyOwner)
      return t ? [t] : []
    }
    const out: Trial[] = []
    for await (const sub of stripe.subscriptions.list({ status: 'trialing', limit: 100 })) {
      // metadata.userId is set at checkout; trials are newer than that code.
      const ownerId = sub.metadata?.userId
      const t = ownerId ? fromStripe(sub, ownerId) : null
      if (t) out.push(t)
    }
    return out
  } catch (err) {
    console.error('[trial] stripe', err)
    return []
  }
}

/** Every family in a free trial right now, or just `onlyOwner`'s. */
export async function loadTrials(admin: Admin, stripe: Stripe | null, now: Date, onlyOwner?: string): Promise<Trial[]> {
  const [apple, web] = await Promise.all([appleTrials(admin, now, onlyOwner), stripeTrials(admin, stripe, onlyOwner)])
  // A family on both rails: the later end is the one that matters.
  const by = new Map<string, Trial>()
  for (const t of [...apple, ...web]) {
    const prev = by.get(t.ownerId)
    if (!prev || t.endsAt > prev.endsAt) by.set(t.ownerId, t)
  }
  return [...by.values()]
}

export async function trialStats(admin: Admin, family: FamilyData, since: Date): Promise<TrialStats> {
  if (!family.childIds.length) return { choresDone: 0, routinesDone: 0 }
  const { data: chores } = await admin.from('chores').select('id').in('child_id', family.childIds)
  const choreIds = (chores ?? []).map((c: { id: string }) => c.id)
  const [done, routines] = await Promise.all([
    choreIds.length
      ? admin.from('chore_completions').select('id', { count: 'exact', head: true }).in('chore_id', choreIds).gte('completed_at', since.toISOString())
      : Promise.resolve({ count: 0 }),
    admin.from('routine_completions').select('id', { count: 'exact', head: true }).in('child_id', family.childIds).gte('completed_at', since.toISOString()),
  ])
  return { choresDone: done.count ?? 0, routinesDone: routines.count ?? 0 }
}

/** Untried Premium features as card copy, the order discovery uses. */
export function untriedPremium(usage: FamilyUsage, kid: string, lang: CopyLang = 'en') {
  return untriedFeatures(usage, true, 'push').filter((f) => f.premiumOnly).map((f) => ({ id: f.id, ...cardCopy(f, kid, lang) }))
}

export async function loadFamily(admin: Admin, ownerId: string): Promise<FamilyData | null> {
  return (await loadFamilies(admin, ownerId)).get(ownerId) ?? null
}

/** Sends one email through Resend; throws on failure. */
export async function sendTrialEmail(to: string, email: { subject: string; text: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set')
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM, to, replyTo: REPLY_TO, subject: email.subject, text: email.text })
  if (result.error) throw new Error(`${result.error.name}: ${result.error.message}`)
  return result.data?.id ?? 'ok'
}
