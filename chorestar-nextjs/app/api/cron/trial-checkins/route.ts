import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/utils/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { sendPushToUser } from '@/lib/push/notify'
import { familyLimits } from '@/lib/billing/plan-limits'
import {
  TRIAL_STEPS,
  dayOneTrialPush,
  dayThreeTrialEmail,
  endingTrialEmail,
  endingTrialPush,
  loadFamily,
  loadTrials,
  premiumUsed,
  sendTrialEmail,
  trialStats,
  trialStepDue,
  untriedPremium,
  type TrialStep,
} from '@/lib/engagement/trial'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/trial-checkins (Vercel Cron, daily; vercel.json)
 *
 * The three touches of a free week (lib/engagement/trial.ts): a day-1 push,
 * a day-3 email, and a push plus email two days before the end. Each goes to
 * a family once, recorded in outreach_sent_log under the step's name (push-only
 * steps too, with resend_id 'push'), and at most one step per family per run.
 *
 * ?dry=1 lists who is due and with what, and sends nothing.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const admin = createServiceRoleClient() as any
  const now = new Date()
  const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null

  const trials = await loadTrials(admin, stripe, now)
  const results: { family: string; rail: string; step: string; result: string }[] = []

  for (const trial of trials) {
    const { data: profile } = await admin.from('profiles').select('email, family_name, subscription_type').eq('id', trial.ownerId).maybeSingle()
    if (!profile?.email || profile.subscription_type === 'free') continue

    const { data: log } = await admin
      .from('outreach_sent_log')
      .select('campaign')
      .in('campaign', TRIAL_STEPS)
      .ilike('email', profile.email.replace(/[\\%_]/g, (c: string) => `\\${c}`))
    const sent = new Set<TrialStep>((log ?? []).map((r: { campaign: TrialStep }) => r.campaign))
    const step = trialStepDue(trial, now, sent)
    if (!step) continue

    const family = await loadFamily(admin, trial.ownerId)
    if (!family) continue
    const kid = family.kidName ?? 'your kids'

    try {
      let resendId = 'push'
      if (step === 'trial-day1') {
        const push = dayOneTrialPush(kid, family.usage)
        if (dry) { results.push({ family: trial.ownerId, rail: trial.rail, step, result: `would push: ${push.title}` }); continue }
        await sendPushToUser(trial.ownerId, push.title, push.body)
      } else if (step === 'trial-day3') {
        const email = dayThreeTrialEmail({ kid, stats: await trialStats(admin, family, trial.startedAt), untried: untriedPremium(family.usage, kid), endsAt: trial.endsAt })
        if (dry) { results.push({ family: trial.ownerId, rail: trial.rail, step, result: `would email: ${email.subject}` }); continue }
        resendId = await sendTrialEmail(profile.email, email)
      } else {
        const { wouldPause } = await familyLimits(admin, trial.ownerId)
        const email = endingTrialEmail({
          rail: trial.rail,
          stats: await trialStats(admin, family, trial.startedAt),
          used: premiumUsed(family.usage),
          wouldPause,
          endsAt: trial.endsAt,
        })
        const push = endingTrialPush(trial.endsAt)
        if (dry) { results.push({ family: trial.ownerId, rail: trial.rail, step, result: `would push + email: ${email.subject}` }); continue }
        await sendPushToUser(trial.ownerId, push.title, push.body)
        resendId = await sendTrialEmail(profile.email, email)
      }
      await admin.from('outreach_sent_log').insert({ campaign: step, email: profile.email, family_name: profile.family_name, resend_id: resendId })
      results.push({ family: trial.ownerId, rail: trial.rail, step, result: 'sent' })
    } catch (err) {
      console.error('[trial-checkins]', trial.ownerId, step, err)
      results.push({ family: trial.ownerId, rail: trial.rail, step, result: 'failed' })
    }
  }

  return NextResponse.json({ dry, inTrial: trials.length, results })
}
