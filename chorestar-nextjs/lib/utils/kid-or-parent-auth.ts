import 'server-only'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { loadChild, type WalletChild } from '@/lib/utils/wallet'

/**
 * Resolve WHICH child a kid-facing request is about, from either credential.
 *
 * A kid's own device holds a kid session token. Kid mode on a parent's device
 * holds the parent's Supabase JWT and names the child with `?childId=` (or a
 * body field). Both paths end in the same place: a child the caller may act
 * for, plus whether it was the kid or a parent asking (kids are held to the
 * free-tier limits; parents can override).
 */
export interface KidRequestContext {
  child: WalletChild
  actor: 'kid' | 'parent'
  parentUserId: string | null
}

export async function resolveKidRequest(
  request: Request,
  childIdHint: string | null | undefined
): Promise<KidRequestContext | null> {
  const kid = await validateKidToken(request)
  if (kid) {
    const child = await loadChild(kid.childId)
    return child ? { child, actor: 'kid', parentUserId: null } : null
  }

  const parentUserId = await getParentUserId(request)
  if (!parentUserId || !childIdHint || !/^[0-9a-f-]{36}$/i.test(childIdHint)) return null
  const child = await loadChild(childIdHint)
  if (!child) return null
  const families = await familiesForUser(parentUserId)
  if (!families.includes(child.user_id)) return null
  return { child, actor: 'parent', parentUserId }
}
