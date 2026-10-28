import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { getStripe } from '@/lib/stripe'
import { copyLang } from '@/lib/engagement/discovery'
import { loadFamily, loadTrials, premiumUsed, trialDay, trialStats, untriedPremium } from '@/lib/engagement/trial'

export const dynamic = 'force-dynamic'

/**
 * GET /api/engagement/trial[?lang=es]
 *
 * `{ trial: null }`, or for a family in its free week:
 *   { trial: { rail, endsAt, renewing, day, choresDone, routinesDone,
 *              used: string[], next: { id, title, body, cta } | null } }
 * which the dashboards' trial card shows: how the week is going, what Premium
 * they have used, and one Premium feature to try next (`lang` translates the
 * feature copy, as on /api/engagement/discover). Owner or co-parent,
 * web session or a native app's Bearer token.
 */
export async function GET(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const admin = createServiceRoleClient() as any
    const { effectiveUserId: ownerId } = await getEffectiveFamilyId(admin, userId)
    const now = new Date()
    const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null
    const [trial] = await loadTrials(admin, stripe, now, ownerId)
    if (!trial) return NextResponse.json({ trial: null }, { headers })

    const family = await loadFamily(admin, ownerId)
    const stats = family ? await trialStats(admin, family, trial.startedAt) : { choresDone: 0, routinesDone: 0 }
    const kid = family?.kidName ?? 'your kids'
    const lang = copyLang(new URL(request.url).searchParams.get('lang'))
    const next = family ? untriedPremium(family.usage, kid, lang)[0] ?? null : null
    return NextResponse.json(
      {
        trial: {
          rail: trial.rail,
          endsAt: trial.endsAt.toISOString(),
          renewing: trial.renewing,
          day: trialDay(trial.startedAt, now),
          ...stats,
          used: family ? premiumUsed(family.usage, lang) : [],
          next,
        },
      },
      { headers }
    )
  } catch (err) {
    console.error('[trial]', err)
    return NextResponse.json({ trial: null }, { headers })
  }
}
