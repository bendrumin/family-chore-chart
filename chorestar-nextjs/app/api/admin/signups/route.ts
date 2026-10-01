import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { collectSignups } from '@/lib/admin/signups'

export const dynamic = 'force-dynamic'

/** Recent signups with platform, method, source, and activation, for the admin Signups tab. */
export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    return NextResponse.json(await collectSignups(createServiceRoleClient()))
  } catch (err) {
    console.error('Admin signups error:', err)
    return NextResponse.json({ error: 'Failed to load signups' }, { status: 500 })
  }
}
