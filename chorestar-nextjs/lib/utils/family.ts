import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the effective family owner's user ID for the given user.
 * If the user is a member of another family (via family_members),
 * returns that family's owner ID. Otherwise returns the user's own ID.
 */
export async function getEffectiveFamilyId(
  supabase: SupabaseClient,
  userId: string
): Promise<{ effectiveUserId: string; isSharedMember: boolean }> {
  const { data } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (data?.family_id) {
    return { effectiveUserId: data.family_id, isSharedMember: true }
  }

  return { effectiveUserId: userId, isSharedMember: false }
}
