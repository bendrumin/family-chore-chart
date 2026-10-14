import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { FROM, REPLY_TO, logOutreachSend } from '@/lib/admin/outreach-send'
import {
  DIRECT_PREFIX,
  directCampaign,
  fillTemplate,
  sentRecently,
  validateCompose,
  varsFor,
  type ComposeFamily,
} from '@/lib/admin/compose'

type Row = { id: string; email: string | null; family_name: string | null; subscription_type: string | null }

/** Families with their kids' names and when they last got a direct note. */
async function withDetails(admin: SupabaseClient, rows: Row[]): Promise<ComposeFamily[]> {
  const families = rows.filter((r) => r.email)
  if (!families.length) return []
  const [{ data: kids }, { data: sent }] = await Promise.all([
    admin.from('children').select('user_id, name, created_at').in('user_id', families.map((f) => f.id)).order('created_at'),
    admin
      .from('outreach_sent_log')
      .select('email, sent_at')
      .in('email', families.map((f) => f.email!))
      .like('campaign', `${DIRECT_PREFIX}%`)
      .order('sent_at', { ascending: false }),
  ])
  return families.map((f) => ({
    userId: f.id,
    email: f.email!,
    familyName: f.family_name ?? '',
    subscription: f.subscription_type ?? 'free',
    kidNames: (kids ?? []).filter((k: { user_id: string }) => k.user_id === f.id).map((k: { name: string }) => k.name),
    lastDirectSentAt:
      (sent ?? []).find((s: { email: string }) => s.email.toLowerCase() === f.email!.toLowerCase())?.sent_at ?? null,
  }))
}

/** GET ?q=<email or family name> searches; ?userId= loads one family. */
export async function GET(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  // PostgREST's or() syntax treats these as separators; a search never needs them.
  const q = (searchParams.get('q') ?? '').replace(/[,()*%\\]/g, ' ').trim()
  const admin = createServiceRoleClient() as unknown as SupabaseClient

  let query = admin.from('profiles').select('id, email, family_name, subscription_type').limit(10)
  if (userId) query = query.eq('id', userId)
  else if (q.length >= 2) query = query.or(`email.ilike.%${q}%,family_name.ilike.%${q}%`).order('created_at', { ascending: false })
  else return NextResponse.json({ families: [] })

  const { data, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ families: await withDetails(admin, (data ?? []) as Row[]) })
}

/**
 * POST { userId, subject, body, confirmRecent? } sends one note. The family is
 * loaded here, never taken from the client, so the address can't be swapped.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminApi()
  if (error) return error

  const { userId, subject, body, confirmRecent } = (await request.json()) as {
    userId?: string
    subject?: string
    body?: string
    confirmRecent?: boolean
  }
  if (!userId) return NextResponse.json({ error: 'Pick a family.' }, { status: 400 })
  const invalid = validateCompose({ subject: subject ?? '', body: body ?? '' })
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 503 })

  const admin = createServiceRoleClient() as unknown as SupabaseClient
  const { data: row } = await admin.from('profiles').select('id, email, family_name, subscription_type').eq('id', userId).maybeSingle()
  const [family] = row ? await withDetails(admin, [row as Row]) : []
  if (!family) return NextResponse.json({ error: 'That family has no email address.' }, { status: 404 })

  if (!confirmRecent && sentRecently(family.lastDirectSentAt)) {
    return NextResponse.json({ recent: true, lastDirectSentAt: family.lastDirectSentAt }, { status: 409 })
  }

  const vars = varsFor(family)
  const finalSubject = fillTemplate(subject!.trim(), vars)
  const result = await new Resend(apiKey).emails.send({
    from: FROM,
    to: family.email,
    replyTo: REPLY_TO,
    subject: finalSubject,
    text: fillTemplate(body!.trim(), vars),
  })
  if (result.error) {
    console.error('Admin compose send failed:', result.error)
    return NextResponse.json({ error: result.error.message }, { status: 502 })
  }

  const resendId = result.data?.id ?? 'ok'
  try {
    await logOutreachSend(createServiceRoleClient(), {
      campaign: directCampaign(finalSubject),
      email: family.email,
      familyName: family.familyName,
      resendId,
    })
  } catch (logError) {
    // The email went; a missing log row only hides it from Send History.
    console.error('Admin compose: sent but not logged:', logError)
  }
  return NextResponse.json({ sent: true, resendId, to: family.email })
}
