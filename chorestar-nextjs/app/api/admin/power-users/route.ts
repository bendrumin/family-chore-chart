import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { analyzePowerUsers } from '@/lib/admin/power-users'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const admin = createServiceRoleClient()
    const report = await analyzePowerUsers(admin)
    return NextResponse.json(report)
  } catch (err) {
    console.error('Admin power-users error:', err)
    return NextResponse.json({ error: 'Failed to analyze users' }, { status: 500 })
  }
}
