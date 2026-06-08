import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin/is-admin'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

/** API routes — return 404 to hide admin surface from non-admins */
export async function requireAdminApi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return { user: null, error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  return { user, error: null }
}

/** Server pages — redirect non-admins to dashboard */
export async function requireAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (!isAdminEmail(user.email)) {
    redirect('/dashboard')
  }

  return user
}
