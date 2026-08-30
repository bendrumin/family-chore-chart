import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser, signProofUrl } from '@/lib/utils/approval'
import { DAY_LONG } from '@/lib/utils/schedule'

/**
 * GET /api/chores/pending — every tick waiting for this parent's OK.
 *
 * One list across all the families the caller belongs to, newest first, with
 * enough context to decide from the tray: the kid, the chore, the day, and a
 * short-lived signed URL for the proof photo when there is one.
 */
export async function GET(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createServiceRoleClient()
    const families = await familiesForUser(userId)

    const { data: children } = await admin
      .from('children')
      .select('id, name, avatar_color, user_id')
      .in('user_id', families)
    const childList = children ?? []
    if (childList.length === 0) {
      return NextResponse.json({ items: [], redemptions: [] }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const { data: chores } = await admin
      .from('chores')
      .select('id, name, icon, child_id, reward_cents')
      .in('child_id', childList.map(c => c.id))
    const choreList = chores ?? []

    // Store requests waiting for review ride along in the same tray.
    const { data: redemptionRows } = await admin
      .from('reward_redemptions')
      .select('id, child_id, reward_item_id, price_cents, requested_at')
      .in('child_id', childList.map(c => c.id))
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(50)
    const itemIds = [...new Set((redemptionRows ?? []).map(r => r.reward_item_id))]
    const { data: itemRows } = itemIds.length
      ? await admin.from('reward_items').select('id, title, emoji').in('id', itemIds)
      : { data: [] as Array<{ id: string; title: string; emoji: string | null }> }
    const itemById = new Map((itemRows ?? []).map(i => [i.id, i]))
    const childForRedemption = new Map(childList.map(c => [c.id, c]))
    const redemptions = (redemptionRows ?? []).map(r => {
      const item = itemById.get(r.reward_item_id)
      const child = childForRedemption.get(r.child_id)
      return {
        id: r.id,
        childId: r.child_id,
        childName: child?.name ?? 'Kid',
        childColor: child?.avatar_color ?? null,
        itemId: r.reward_item_id,
        itemTitle: item?.title ?? 'Reward',
        itemEmoji: item?.emoji ?? null,
        priceCents: r.price_cents,
        requestedAt: r.requested_at,
      }
    })

    const { data: pending } = choreList.length
      ? await admin
      .from('chore_completions')
      .select('id, chore_id, day_of_week, week_start, completed_at, proof_path')
      .in('chore_id', choreList.map(c => c.id))
      .eq('status', 'pending')
      .order('completed_at', { ascending: false })
      .limit(100)
      : { data: [] as Array<{ id: string; chore_id: string; day_of_week: number; week_start: string; completed_at: string; proof_path: string | null }> }

    const choreById = new Map(choreList.map(c => [c.id, c]))
    const childById = new Map(childList.map(c => [c.id, c]))

    const items = await Promise.all(
      (pending ?? []).map(async row => {
        const chore = choreById.get(row.chore_id)
        const child = chore ? childById.get(chore.child_id) : undefined
        return {
          id: row.id,
          choreId: row.chore_id,
          choreName: chore?.name ?? 'Chore',
          choreIcon: chore?.icon ?? null,
          rewardCents: chore?.reward_cents ?? 0,
          childId: child?.id ?? null,
          childName: child?.name ?? 'Kid',
          childColor: child?.avatar_color ?? null,
          dayOfWeek: row.day_of_week,
          dayName: DAY_LONG[row.day_of_week] ?? '',
          weekStart: row.week_start,
          completedAt: row.completed_at,
          hasPhoto: Boolean(row.proof_path),
          photoUrl: await signProofUrl(row.proof_path),
        }
      })
    )

    return NextResponse.json({ items, redemptions }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[chores/pending]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
