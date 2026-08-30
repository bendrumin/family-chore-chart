import 'server-only'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Resolve the signed-in PARENT for an API request.
 *
 * Web sends the session cookie; iOS sends `Authorization: Bearer <access
 * token>`. Both are Supabase auth users, unlike kid tokens (see kid-auth.ts).
 * Returns the user id or null.
 */
export async function getParentUserId(request: Request): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user.id

    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const admin = createServiceRoleClient()
        const { data } = await admin.auth.getUser(token)
        return data?.user?.id ?? null
      }
    }
  } catch {
    // fall through
  }
  return null
}
