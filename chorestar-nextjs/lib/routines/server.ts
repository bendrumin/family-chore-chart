import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isPremium } from '@/lib/utils/subscription'
import { ROUTINE_STEP_PHOTO_BUCKET, isStepPhotoPathFor } from './step-photos'

/**
 * Server helpers for the routine upgrades (migration 032): who owns a child,
 * whether that family is Premium, and signed URLs for step pictures.
 */

type Admin = ReturnType<typeof createServiceRoleClient>

/** The family owner's user id for a child, or null. */
export async function ownerOfChild(childId: string, admin: Admin = createServiceRoleClient()): Promise<string | null> {
  const { data } = await admin.from('children').select('user_id').eq('id', childId).maybeSingle()
  return data?.user_id ?? null
}

/**
 * Premium for a family (the owner's plan; co-parents inherit it). New routine
 * features are plain Premium, not grandfathered, like the template library.
 */
export async function isFamilyPremium(ownerId: string, admin: Admin = createServiceRoleClient()): Promise<boolean> {
  try {
    const { data } = await admin.from('profiles').select('subscription_type').eq('id', ownerId).maybeSingle()
    return isPremium(data?.subscription_type ?? 'free')
  } catch {
    return false
  }
}

/** The family's language from Settings > Family, for read-aloud. */
export async function familyLanguage(ownerId: string, admin: Admin = createServiceRoleClient()): Promise<string | null> {
  try {
    const { data } = await admin.from('family_settings').select('language').eq('user_id', ownerId).maybeSingle()
    return data?.language ?? null
  } catch {
    return null
  }
}

/**
 * Sign every step picture in one storage call. Paths outside the family's own
 * folder are dropped, never signed. Returns path → URL. Never throws.
 */
export async function signStepPhotos(
  paths: Array<{ path: string | null | undefined; ownerId: string }>,
  ttlSeconds = 2 * 60 * 60,
  admin: Admin = createServiceRoleClient()
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const valid = [...new Set(paths.filter(p => isStepPhotoPathFor(p.path, p.ownerId)).map(p => p.path as string))]
  if (valid.length === 0) return out
  try {
    const { data, error } = await admin.storage.from(ROUTINE_STEP_PHOTO_BUCKET).createSignedUrls(valid, ttlSeconds)
    if (error || !data) return out
    for (const row of data) {
      if (row.path && row.signedUrl) out.set(row.path, row.signedUrl)
    }
  } catch {
    // Pictures are a nicety; the icon still shows.
  }
  return out
}

/** Best-effort delete of step pictures that no step points at any more. */
export async function removeStepPhotos(paths: string[], admin: Admin = createServiceRoleClient()): Promise<void> {
  if (paths.length === 0) return
  try {
    await admin.storage.from(ROUTINE_STEP_PHOTO_BUCKET).remove(paths)
  } catch {
    // An orphaned object is harmless.
  }
}

type StepLike = { image_path?: string | null; [k: string]: unknown }
type RoutineLike = { routine_steps?: StepLike[] | null; [k: string]: unknown }

/**
 * Add `image_url` to every step with a picture (and sort steps), for one
 * family's routines. Used by every routine read path, kid and parent.
 */
export async function withStepPhotoUrls<R extends RoutineLike>(
  routines: R[],
  ownerId: string | null,
  admin: Admin = createServiceRoleClient()
): Promise<R[]> {
  const urls = ownerId
    ? await signStepPhotos(
        routines.flatMap(r => (r.routine_steps ?? []).map(s => ({ path: s.image_path, ownerId }))),
        undefined,
        admin
      )
    : new Map<string, string>()
  return routines.map(r => ({
    ...r,
    routine_steps: [...(r.routine_steps ?? [])]
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
      .map(s => ({ ...s, image_url: s.image_path ? urls.get(s.image_path) ?? null : null })),
  }))
}
