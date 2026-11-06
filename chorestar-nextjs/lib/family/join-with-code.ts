import { createClient } from '@/lib/supabase/client'

/**
 * Join another family as a co-parent with their invite code, through the
 * join_family_with_code RPC (migration 028), which checks the code, refuses
 * your own family and families without Premium, and rate-limits wrong codes.
 * Shared by Settings > Family Sharing and the first-run wizard.
 */
export async function joinFamilyWithCode(input: string): Promise<{ ownerId: string } | { error: string }> {
  const code = input.trim().toLowerCase()
  if (!code) return { error: 'Enter the invite code' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in first' }

  // A code that doesn't exist comes back as null rather than an error.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ownerId, error } = await (supabase as any).rpc('join_family_with_code', { p_code: code })
  if (error) {
    const why = `${error.message ?? ''} ${error.hint ?? ''}`
    if (why.includes('own_family')) return { error: "That's your own family code" }
    if (why.includes('family_not_premium')) return { error: 'That family needs Premium to share. Ask the owner to upgrade.' }
    if (why.includes('too_many_attempts')) return { error: 'Too many tries. Wait an hour and try again.' }
    return { error: 'Could not join family' }
  }
  if (!ownerId) return { error: 'Code not found' }
  return { ownerId }
}
