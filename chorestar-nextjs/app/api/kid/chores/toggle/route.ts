import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { notifyIfAllChoresDone, notifyPendingApproval } from '@/lib/push/notify'
import { kidTickStatus, removeProofObject } from '@/lib/utils/approval'

/**
 * POST /api/kid/chores/toggle — a kid checks a chore off (or un-checks it).
 *
 * Body: { choreId, dayOfWeek, weekStart, completed }
 *   completed is the DESIRED state, not a toggle command — retries and double
 *   taps are then idempotent instead of flapping the value.
 *
 * Returns { success, completed, status } where status is 'approved' or
 * 'pending'. A tick lands as pending when the family has approval mode on
 * (migration 016); it then counts only once a parent approves. A chore that
 * asks for a photo cannot be ticked here at all: the client must send the
 * photo through /api/kid/chores/proof, which creates the pending tick.
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
      .select('id, name, child_id, is_active, requires_photo')
      .eq('id', choreId)
      .eq('child_id', session.childId)
      .maybeSingle()

    if (!chore || chore.is_active === false) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
    }

    if (completed) {
      if (chore.requires_photo) {
        // The client opens the camera and posts to /api/kid/chores/proof.
        return NextResponse.json({ error: 'photo_required' }, { status: 400 })
      }

      const { data: child } = await admin
        .from('children')
        .select('user_id')
        .eq('id', session.childId)
        .maybeSingle()
      if (!child) {
        return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
      }

      const status = await kidTickStatus(child.user_id, chore)

      const { data: inserted, error } = await admin
        .from('chore_completions')
        .insert({
          chore_id: choreId,
          day_of_week: dayOfWeek,
          week_start: weekStart,
          status,
        })
        .select('id, status')
        .maybeSingle()

      if (error && error.code !== '23505') {
        console.error('[kid/chores/toggle] insert failed:', error.message)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }

      // 23505 = a row already exists (maybe already approved by a parent). The
      // desired state holds; report the row's real status.
      let finalStatus = inserted?.status ?? status
      let completionId = inserted?.id ?? null
      if (error?.code === '23505') {
        const { data: existing } = await admin
          .from('chore_completions')
          .select('id, status')
          .eq('chore_id', choreId)
          .eq('day_of_week', dayOfWeek)
          .eq('week_start', weekStart)
          .maybeSingle()
        finalStatus = existing?.status ?? finalStatus
        completionId = existing?.id ?? null
      } else if (finalStatus === 'approved') {
        // after(), not a bare void promise: Vercel freezes the invocation once
        // the response goes out, killing an in-flight APNs send.
        after(() => notifyIfAllChoresDone(session.childId, weekStart, dayOfWeek))
      } else if (completionId) {
        const id = completionId
        after(() => notifyPendingApproval(session.childId, chore.name, id, false))
      }

      return NextResponse.json({ success: true, completed: true, status: finalStatus })
    }

    // Un-tick: remove the row whatever its state, and any proof photo with it.
    const { data: existing } = await admin
      .from('chore_completions')
      .select('proof_path')
      .eq('chore_id', choreId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_start', weekStart)
      .maybeSingle()

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
    if (existing?.proof_path) after(() => removeProofObject(existing.proof_path))

    return NextResponse.json({ success: true, completed: false, status: null })
  } catch (error) {
    console.error('[kid/chores/toggle] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
