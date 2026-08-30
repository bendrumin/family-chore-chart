import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser, removeProofObject } from '@/lib/utils/approval'
import { notifyIfAllChoresDone } from '@/lib/push/notify'

/**
 * POST /api/chores/approve — a parent reviews a pending tick.
 *
 * Body: { completionId, action: 'approve' | 'reject' }
 *
 * Approve marks the row approved (it now counts toward the day, streak, and
 * allowance) and fires the usual "all chores done" check. Reject DELETES the
 * row and its proof photo: the kid sees the chore back on their list, which
 * is exactly what "send it back" should mean. Nothing is kept as 'rejected'.
 *
 * Auth: web session cookie or iOS Bearer token; the caller must own the
 * family or be a shared member of it.
 */
const bodySchema = z.object({
  completionId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
})

export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { completionId, action } = parsed.data

  try {
    const admin = createServiceRoleClient()

    const { data: completion } = await admin
      .from('chore_completions')
      .select('id, chore_id, day_of_week, week_start, status, proof_path')
      .eq('id', completionId)
      .maybeSingle()
    if (!completion) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: chore } = await admin
      .from('chores')
      .select('id, child_id')
      .eq('id', completion.chore_id)
      .maybeSingle()
    const { data: child } = chore
      ? await admin.from('children').select('id, user_id').eq('id', chore.child_id).maybeSingle()
      : { data: null }
    if (!chore || !child) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const families = await familiesForUser(userId)
    if (!families.includes(child.user_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'approve') {
      const { error } = await admin
        .from('chore_completions')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: userId })
        .eq('id', completionId)
      if (error) {
        console.error('[chores/approve] update failed:', error.message)
        return NextResponse.json({ error: 'Could not approve' }, { status: 500 })
      }
      after(() => notifyIfAllChoresDone(child.id, completion.week_start, completion.day_of_week))
      return NextResponse.json({ ok: true, status: 'approved' })
    }

    const { error } = await admin.from('chore_completions').delete().eq('id', completionId)
    if (error) {
      console.error('[chores/approve] delete failed:', error.message)
      return NextResponse.json({ error: 'Could not send back' }, { status: 500 })
    }
    if (completion.proof_path) after(() => removeProofObject(completion.proof_path))
    return NextResponse.json({ ok: true, status: 'rejected' })
  } catch (error) {
    console.error('[chores/approve]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
