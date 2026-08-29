import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { collectChoreStarMetrics, fetchKidCanvasMetrics, type HubReport } from '@/lib/admin/hub'

export const dynamic = 'force-dynamic'

/** Cross-product growth numbers for the admin dashboard: ChoreStar plus KidCanvas. */
export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const admin = createServiceRoleClient()
    const [chorestar, kid] = await Promise.all([collectChoreStarMetrics(admin), fetchKidCanvasMetrics()])
    const report: HubReport = {
      generatedAt: new Date().toISOString(),
      chorestar,
      kidcanvas: kid.metrics,
      kidcanvasError: kid.error,
    }
    return NextResponse.json(report)
  } catch (err) {
    console.error('Admin hub error:', err)
    return NextResponse.json({ error: 'Failed to load hub metrics' }, { status: 500 })
  }
}
