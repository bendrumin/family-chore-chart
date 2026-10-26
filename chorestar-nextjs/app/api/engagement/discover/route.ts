import { NextResponse } from 'next/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isPremium } from '@/lib/utils/subscription'
import { FEATURES, nextFeature, type FeatureId } from '@/lib/engagement/discovery'
import { loadFamilies } from '@/lib/engagement/usage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/engagement/discover?skip=routines,star_pets
 *
 * The one feature the dashboard's discover card should show this family, or
 * `{ feature: null }`. `skip` carries the ids this browser has dismissed.
 * Owner only: a co-parent has no children under their own id, so they get
 * null, the same as the getting-started card hiding for shared members.
 */
export async function GET(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const known = new Set<string>(FEATURES.map((f) => f.id))
  const skip = new Set(
    (new URL(request.url).searchParams.get('skip') ?? '').split(',').filter((id) => known.has(id)) as FeatureId[]
  )

  try {
    const admin = createServiceRoleClient() as any
    const families = await loadFamilies(admin, userId)
    const family = families.get(userId)
    if (!family) return NextResponse.json({ feature: null })

    const { data: profile } = await admin.from('profiles').select('subscription_type').eq('id', userId).maybeSingle()
    const feature = nextFeature(family.usage, isPremium(profile?.subscription_type), 'web', skip)
    if (!feature) return NextResponse.json({ feature: null })
    return NextResponse.json({ feature: { id: feature.id, ...feature.card(family.kidName ?? 'Your kids') } })
  } catch (err) {
    console.error('[discover]', err)
    return NextResponse.json({ feature: null })
  }
}
