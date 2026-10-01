import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { collectChoreStarMetrics, type HubReport } from '@/lib/admin/hub'

export const dynamic = 'force-dynamic'

/** ChoreStar growth numbers for the admin dashboard. */
export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const admin = createServiceRoleClient()
    const report: HubReport = {
      generatedAt: new Date().toISOString(),
      chorestar: await collectChoreStarMetrics(admin),
    }
    return NextResponse.json(report)
  } catch (err) {
    console.error('Admin hub error:', err)
    return NextResponse.json({ error: 'Failed to load hub metrics' }, { status: 500 })
  }
}
