import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { notifyIfAllChoresDone } from '@/lib/push/notify'

/**
 * POST /api/kid/chores/toggle — a kid checks a chore off (or un-checks it).
 *
 * Body: { choreId, dayOfWeek, weekStart, completed }
 *   completed is the DESIRED state, not a toggle command — retries and double
 *   taps are then idempotent instead of flapping the value.
 *
 * The chore is verified to belong to the session's child before anything is
 * written; the childId comes from the kid token, so a forged choreId from a
 * sibling's list is rejected with the same 404 as a nonexistent one.
 */
export async function POST(request: Request) {
  const session = await validateKidToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: {
    choreId?: unknown
    dayOfWeek?: unknown
    weekStart?: unknown
    completed?: unknown
  } | null = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const choreId = String(body?.choreId ?? '')
  const dayOfWeek = Number(body?.dayOfWeek)
  const weekStart = String(body?.weekStart ?? '')
  const completed = body?.completed === true

  if (!/^[0-9a-f-]{36}$/i.test(choreId)) {
    return NextResponse.json({ error: 'choreId is required' }, { status: 400 })
  }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    const admin = createServiceRoleClient()

    // Ownership check before any write.
    const { data: chore } = await admin
      .from('chores')
      .select('id, child_id, is_active')
      .eq('id', choreId)
      .eq('child_id', session.childId)
      .maybeSingle()

    if (!chore || chore.is_active === false) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
    }

    if (completed) {
      const { error } = await admin.from('chore_completions').insert({
        chore_id: choreId,
        day_of_week: dayOfWeek,
        week_start: weekStart,
      })
      // 23505 = already completed; the desired state holds, so that's success.
      if (error && error.code !== '23505') {
        console.error('[kid/chores/toggle] insert failed:', error.message)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
    } else {
      const { error } = await admin
        .from('chore_completions')
        .delete()
        .eq('chore_id', choreId)
        .eq('day_of_week', dayOfWeek)
        .eq('week_start', weekStart)
      if (error) {
        console.error('[kid/chores/toggle] delete failed:', error.message)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
    }

    if (completed) {
      // Fire-and-forget: if this tap finished the whole list, the parent's
      // phone buzzes. A push failure must never fail the toggle.
      void notifyIfAllChoresDone(session.childId, weekStart, dayOfWeek)
    }

    return NextResponse.json({ success: true, completed })
  } catch (error) {
    console.error('[kid/chores/toggle] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
