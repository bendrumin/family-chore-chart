import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { getOutreachSentHistory, logManualSendBatch, logOutreachSend } from '@/lib/admin/outreach-send'

export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const admin = createServiceRoleClient()
    const { rows, tableMissing } = await getOutreachSentHistory(admin)
    return NextResponse.json({ rows, tableMissing })
  } catch (err) {
    console.error('Admin outreach sent history error:', err)
    return NextResponse.json({ error: 'Failed to load send history' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const body = await request.json()
    const { batch, campaign, email, familyName } = body as {
      batch?: string
      campaign?: string
      email?: string
      familyName?: string
    }

    const admin = createServiceRoleClient()

    if (batch) {
      const result = await logManualSendBatch(admin, batch)
      if (result.empty) {
        return NextResponse.json({
          success: false,
          empty: true,
          hint: result.hint,
        })
      }
      return NextResponse.json({ success: true, ...result })
    }

    if (!campaign || !email) {
      return NextResponse.json({ error: 'batch or (campaign and email) required' }, { status: 400 })
    }

    await logOutreachSend(admin, {
      campaign,
      email,
      familyName: familyName || '(manual)',
      resendId: 'manual',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'OUTREACH_TABLE_MISSING') {
      return NextResponse.json(
        { error: 'outreach_sent_log table missing. Run database-migrations/004_outreach_sent_log.sql in Supabase.' },
        { status: 503 }
      )
    }
    console.error('Admin mark-sent error:', err)
    return NextResponse.json({ error: 'Failed to log send' }, { status: 500 })
  }
}
