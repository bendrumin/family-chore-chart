import { createServiceRoleClient } from '@/lib/supabase/server'
import { CHILD_AVATAR_BUCKET } from '@/lib/constants/storage'

/**
 * Resolving a child's uploaded photo for kid mode.
 *
 * Kids are not authenticated Supabase users — they hold a `kid_sessions` token,
 * not a JWT — so the Storage RLS policies from migration 008 cannot serve them:
 * those key on `auth.uid()`, which is null for a kid. The signed URL therefore
 * has to be minted server-side with the service role, which bypasses RLS.
 *
 * This is the same shape as the rest of kid mode: the kid client never talks to
 * Supabase directly, it talks to our API, and the service role does the work
 * behind it.
 */

export { CHILD_AVATAR_BUCKET } from '@/lib/constants/storage'

/**
 * How long a kid-facing avatar URL stays valid.
 *
 * A kid session lasts 8 hours, but the URL is deliberately much shorter-lived
 * than that. It carries no authentication of its own — anyone holding it can
 * fetch the image until it expires — and the kid dashboard re-mints on every
 * load, so a short window costs nothing. Long enough to comfortably cover one
 * sitting; short enough that a URL copied out of a browser log is stale fast.
 */
export const KID_AVATAR_URL_TTL_SECONDS = 60 * 60

/**
 * Mint a signed URL for a child's uploaded photo, or null if there isn't one.
 *
 * Never throws: an avatar is decoration, and a Storage hiccup must not be able
 * to break a kid's login or dashboard. Callers fall back to the preset URL, the
 * emoji, or initials.
 */
export async function signChildAvatarUrl(
  photoPath: string | null | undefined,
  ttlSeconds: number = KID_AVATAR_URL_TTL_SECONDS
): Promise<string | null> {
  if (!photoPath) return null

  try {
    const admin = createServiceRoleClient()
    const { data, error } = await admin.storage
      .from(CHILD_AVATAR_BUCKET)
      .createSignedUrl(photoPath, ttlSeconds)

    if (error) {
      console.error('[child-avatar] Failed to sign', photoPath, error.message)
      return null
    }
    return data?.signedUrl ?? null
  } catch (error) {
    console.error('[child-avatar] Unexpected error signing', photoPath, error)
    return null
  }
}

/**
 * Look up one child's photo path and sign it, in a single tolerant step.
 *
 * Deliberately its own query rather than a column added to whatever query the
 * caller already runs. In /api/child-pin/verify the surrounding query is what
 * AUTHENTICATES the PIN, and PostgREST fails an entire select when it cannot
 * resolve a column — so a missing `avatar_photo_path` would not degrade to "no
 * photo", it would return "Authentication failed" to every kid in every family.
 *
 * Keeping it separate also means the code and the migration can deploy in either
 * order: before migration 009 this returns null, after it returns a URL. Nothing
 * in between is broken.
 *
 * Returns null for any failure — no photo, no column, Storage down. An avatar is
 * decoration and must never be able to break a login or a dashboard.
 */
export async function signChildAvatarForChild(
  childId: string,
  ttlSeconds?: number
): Promise<string | null> {
  try {
    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from('children')
      .select('avatar_photo_path')
      .eq('id', childId)
      .maybeSingle()

    // The column not existing yet is an expected state, not an incident.
    if (error) {
      if (!/avatar_photo_path/.test(error.message)) {
        console.error('[child-avatar] Lookup failed for', childId, error.message)
      }
      return null
    }

    return signChildAvatarUrl((data as { avatar_photo_path?: string | null } | null)?.avatar_photo_path, ttlSeconds)
  } catch (error) {
    console.error('[child-avatar] Unexpected lookup error for', childId, error)
    return null
  }
}
