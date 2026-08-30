import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { notifyPendingApproval } from '@/lib/push/notify'
import { proofObjectPath, familiesForUser } from '@/lib/utils/approval'
import { CHORE_PROOF_BUCKET } from '@/lib/constants/storage'

/**
 * POST /api/kid/chores/proof — check a chore off WITH a photo.
 *
 * multipart/form-data: file (image/jpeg|png|webp, 5 MB max), choreId,
 * dayOfWeek, weekStart.
 *
 * Creates (or reuses) the day's completion row as 'pending', uploads the photo
 * to the private chore-proofs bucket at {owner}/{child}/{completion}.jpg, and
 * points the row at it. A photo is meant to be looked at, so the tick always
 * waits for a parent, whatever the family's approval setting.
 *
 * Auth: a kid session token (the kid's own device), or a signed-in parent
 * (kid mode on the parent's device, where the app has a parent JWT and no kid
 * token). Either way the chore must belong to a child the caller may act for.
 */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  const choreId = String(form.get('choreId') ?? '')
  const dayOfWeek = Number(form.get('dayOfWeek'))
  const weekStart = String(form.get('weekStart') ?? '')

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'A photo is required' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Photo is too large (5 MB max)' }, { status: 413 })
  }
  const contentType = file.type || 'image/jpeg'
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: 'Photo must be JPEG, PNG, or WebP' }, { status: 415 })
  }
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

    const { data: chore } = await admin
      .from('chores')
      .select('id, name, child_id, is_active')
      .eq('id', choreId)
      .maybeSingle()
    if (!chore || chore.is_active === false) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
    }

    const { data: child } = await admin
      .from('children')
      .select('id, user_id')
      .eq('id', chore.child_id)
      .maybeSingle()
    if (!child) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
    }

    // Who is asking? The kid this chore belongs to, or a parent of the family.
    const kid = await validateKidToken(request)
    let authorized = kid?.childId === child.id
    if (!authorized) {
      const parentId = await getParentUserId(request)
      if (parentId) {
        const families = await familiesForUser(parentId)
        authorized = families.includes(child.user_id)
      }
    }
    if (!authorized) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // The day's row: reuse if the kid re-sends a photo, else create pending.
    const { data: existing } = await admin
      .from('chore_completions')
      .select('id, proof_path')
      .eq('chore_id', choreId)
      .eq('day_of_week', dayOfWeek)
      .eq('week_start', weekStart)
      .maybeSingle()

    let completionId = existing?.id ?? null
    if (!completionId) {
      const { data: inserted, error } = await admin
        .from('chore_completions')
        .insert({ chore_id: choreId, day_of_week: dayOfWeek, week_start: weekStart, status: 'pending' })
        .select('id')
        .maybeSingle()
      if (error || !inserted) {
        console.error('[kid/chores/proof] insert failed:', error?.message)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
      completionId = inserted.id
    }

    const path = proofObjectPath(child.user_id, child.id, completionId)
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from(CHORE_PROOF_BUCKET)
      .upload(path, bytes, { contentType, upsert: true })
    if (uploadError) {
      console.error('[kid/chores/proof] upload failed:', uploadError.message)
      return NextResponse.json({ error: 'Could not save the photo' }, { status: 500 })
    }

    const { error: updateError } = await admin
      .from('chore_completions')
      .update({ proof_path: path, status: 'pending', reviewed_at: null, reviewed_by: null })
      .eq('id', completionId)
    if (updateError) {
      console.error('[kid/chores/proof] update failed:', updateError.message)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    const id = completionId
    after(() => notifyPendingApproval(child.id, chore.name, id, true))

    return NextResponse.json({ success: true, completed: true, status: 'pending', completionId })
  } catch (error) {
    console.error('[kid/chores/proof] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
