import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { isFamilyPremium, signStepPhotos } from '@/lib/routines/server'
import { ROUTINE_STEP_PHOTO_BUCKET, stepPhotoObjectPath } from '@/lib/routines/step-photos'
import { checkRateLimit, recordAttempt, createRateLimitResponse } from '@/lib/utils/rate-limit'

/**
 * POST /api/routines/step-photo — upload a picture for a routine step
 * (Premium, migration 032).
 *
 * multipart/form-data: file (image/jpeg|png|webp, 5 MB max; the builder
 * downscales to a 1280px JPEG first), childId.
 *
 * Stores it in the private routine-step-photos bucket at
 * {owner}/{child}/{uuid}.jpg, the chore-proof layout, and returns the path
 * (saved on the step with the routine) plus a signed URL for the preview.
 * The step row is written by the routine save, so an upload the parent then
 * abandons is cleaned up the next time that routine is saved or deleted.
 *
 * Auth: a signed-in parent or co-parent of the child's family whose plan is
 * Premium (403 premium_required otherwise).
 */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UPLOAD_LIMIT = { interval: 60 * 60 * 1000, maxAttempts: 60 }

export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  const childId = String(form.get('childId') ?? '')
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
  if (!/^[0-9a-f-]{36}$/i.test(childId)) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 })
  }

  try {
    const admin = createServiceRoleClient()
    const { data: child } = await admin.from('children').select('id, user_id').eq('id', childId).maybeSingle()
    if (!child || !(await familiesForUser(userId)).includes(child.user_id)) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }
    if (!(await isFamilyPremium(child.user_id, admin))) {
      return NextResponse.json({ error: 'premium_required' }, { status: 403 })
    }

    const key = `step-photo:${userId}`
    const rate = await checkRateLimit(key, UPLOAD_LIMIT)
    if (!rate.allowed) {
      return createRateLimitResponse(rate.retryAfter || 60, 'Too many uploads. Please wait a moment and try again.')
    }
    await recordAttempt(key, UPLOAD_LIMIT)

    const path = stepPhotoObjectPath(child.user_id, child.id, randomUUID())
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from(ROUTINE_STEP_PHOTO_BUCKET)
      .upload(path, bytes, { contentType, upsert: false })
    if (uploadError) {
      console.error('[routines/step-photo] upload failed:', uploadError.message)
      return NextResponse.json({ error: 'Could not save the photo' }, { status: 500 })
    }

    const urls = await signStepPhotos([{ path, ownerId: child.user_id }], undefined, admin)
    return NextResponse.json({ path, url: urls.get(path) ?? null })
  } catch (error) {
    console.error('[routines/step-photo] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
