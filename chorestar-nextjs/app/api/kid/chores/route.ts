import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateKidToken } from '@/lib/utils/kid-auth'

/**
 * GET /api/kid/chores?weekStart=YYYY-MM-DD — the signed-in kid's chores and
 * this week's completions.
 *
 * This endpoint exists because kid mode had a structural hole: kids could see
 * and run ROUTINES (which had kid-token endpoints) but never their CHORES —
 * there was no kid-token path to them at all, on either platform. On the flat
 * daily rate the chores are what earn the money, so the core promise ("kids
 * independently check off chores") only actually worked for a kid using a
 * parent's signed-in device.
 *
 * Authorized by the kid session token alone; the childId comes from the token,
 * never from the query, so one kid cannot read a sibling's list.
 *
 * `weekStart` comes from the CLIENT, matching how the parent dashboard writes
 * completions: week_start is the family's local Sunday, and the server (UTC)
 * cannot compute that — near midnight it lands on the wrong week.
 */
export async function GET(request: Request) {
  const session = await validateKidToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const url = new URL(request.url)
  const weekStart = url.searchParams.get('weekStart') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const admin = createServiceRoleClient()

    const { data: chores, error: choresError } = await admin
      .from('chores')
      .select('id, name, icon, category, reward_cents, sort_order')
      .eq('child_id', session.childId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (choresError) {
      console.error('[kid/chores] chores query failed:', choresError.message)
      return NextResponse.json({ error: 'Failed to load chores' }, { status: 500 })
    }

    const choreIds = (chores ?? []).map(c => c.id)
    let completions: { chore_id: string; day_of_week: number | null }[] = []
    if (choreIds.length > 0) {
      const { data, error } = await admin
        .from('chore_completions')
        .select('chore_id, day_of_week')
        .in('chore_id', choreIds)
        .eq('week_start', weekStart)
      if (error) {
        console.error('[kid/chores] completions query failed:', error.message)
        return NextResponse.json({ error: 'Failed to load chores' }, { status: 500 })
      }
      completions = data ?? []
    }

    return NextResponse.json(
      { chores: chores ?? [], completions },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[kid/chores] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
