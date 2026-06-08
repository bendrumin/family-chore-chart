import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { OUTREACH_CAMPAIGNS, OUTREACH_PRESETS } from '@/lib/admin/outreach-campaigns'
import { MANUAL_SEND_LOG_BATCHES } from '@/lib/admin/manual-send-logs'
import { previewOutreach, sendOutreach } from '@/lib/admin/outreach-send'

export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const campaign = searchParams.get('campaign') || undefined
  const preset = searchParams.get('preset') || undefined
  const force = searchParams.get('force') === 'true'

  if (!campaign && !preset) {
    return NextResponse.json({
      campaigns: Object.values(OUTREACH_CAMPAIGNS).map((c) => ({
        id: c.id,
        label: c.label,
        description: c.description,
      })),
      presets: Object.values(OUTREACH_PRESETS).map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        steps: p.steps.map((s) => ({
          campaign: s.campaign,
          emails: s.emails,
        })),
      })),
      manualSendLogs: MANUAL_SEND_LOG_BATCHES.map((b) => ({
        id: b.id,
        label: b.label,
        hint: b.hint,
        count: b.entries.length,
        entries: b.entries,
      })),
    })
  }

  try {
    const admin = createServiceRoleClient()
    const { report, previews, tableMissing } = await previewOutreach(admin, { campaign, preset, force })
    return NextResponse.json({
      totals: report.totals,
      generatedAt: report.generatedAt,
      previews,
      tableMissing,
    })
  } catch (err) {
    console.error('Admin outreach preview error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Preview failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const body = await request.json()
    const { campaign, preset, force } = body as {
      campaign?: string
      preset?: string
      force?: boolean
    }

    if (!campaign && !preset) {
      return NextResponse.json({ error: 'campaign or preset required' }, { status: 400 })
    }

    const admin = createServiceRoleClient()
    const { results, tableMissing } = await sendOutreach(admin, { campaign, preset, force })

    if (tableMissing) {
      return NextResponse.json(
        {
          error: 'outreach_sent_log table missing. Run database-migrations/004_outreach_sent_log.sql in Supabase.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('Admin outreach send error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
