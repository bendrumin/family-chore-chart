import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { CHORE_PROOF_BUCKET } from '@/lib/constants/storage'

/**
 * Server-side helpers for approval mode (migration 016).
 *
 * The rule, in one place so every write path agrees: a KID-path tick waits for
 * a parent when the family has approval on, or when the chore asks for a
 * photo (a photo is meant to be looked at). Parent-path ticks are always
 * approved: the parent is the reviewer.
 */

export type CompletionStatus = 'pending' | 'approved'

export async function kidTickStatus(
  familyOwnerId: string,
  chore: { requires_photo?: boolean | null }
): Promise<CompletionStatus> {
  if (chore.requires_photo) return 'pending'
  try {
    const admin = createServiceRoleClient()
    const { data } = await admin
      .from('family_settings')
      .select('require_approval')
      .eq('user_id', familyOwnerId)
      .maybeSingle()
    return data?.require_approval ? 'pending' : 'approved'
  } catch {
    return 'approved'
  }
}

/** Object path for a proof photo; the leading folder is what storage RLS keys on. */
export function proofObjectPath(familyOwnerId: string, childId: string, completionId: string): string {
  return `${familyOwnerId.toLowerCase()}/${childId.toLowerCase()}/${completionId.toLowerCase()}.jpg`
}

/** Short-lived signed URL for a proof photo, or null. Never throws. */
export async function signProofUrl(path: string | null | undefined, ttlSeconds = 60 * 60): Promise<string | null> {
  if (!path) return null
  try {
    const admin = createServiceRoleClient()
    const { data, error } = await admin.storage.from(CHORE_PROOF_BUCKET).createSignedUrl(path, ttlSeconds)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

/** Best-effort delete of a proof photo. */
export async function removeProofObject(path: string | null | undefined): Promise<void> {
  if (!path) return
  try {
    const admin = createServiceRoleClient()
    await admin.storage.from(CHORE_PROOF_BUCKET).remove([path])
  } catch {
    // The row is what matters; an orphaned object is harmless.
  }
}

/**
 * Which family ids a signed-in parent may act for: their own, plus any family
 * they were invited into (family_members). Mirrors the check in
 * /api/push/chores-done.
 */
export async function familiesForUser(userId: string): Promise<string[]> {
  const admin = createServiceRoleClient()
  const ids = new Set<string>([userId])
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- family_members is newer than the generated types
    const { data } = await (admin as any)
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
    for (const row of (data ?? []) as Array<{ family_id: string }>) {
      if (row.family_id) ids.add(row.family_id)
    }
  } catch {
    // Owner-only is still correct.
  }
  return [...ids]
}
