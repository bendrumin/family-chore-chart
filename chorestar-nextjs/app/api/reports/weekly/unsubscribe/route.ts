import { createServiceRoleClient } from '@/lib/supabase/server'

/** GET /api/reports/weekly/unsubscribe?t=<token>: one click turns the weekly report off. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('t') ?? ''
  const valid = /^[0-9a-f-]{36}$/i.test(token)
  if (valid) {
    await (createServiceRoleClient() as any)
      .from('family_settings')
      .update({ weekly_report_email: false })
      .eq('weekly_report_token', token)
  }
  const body = valid
    ? 'The weekly report is off. You can turn it back on any time in Settings.'
    : 'That link did not work. You can turn the weekly report off in Settings.'
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChoreStar</title><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#111827"><h1 style="font-size:22px">ChoreStar</h1><p>${body}</p><p><a href="https://chorestar.app/dashboard" style="color:#6366f1">Open ChoreStar</a></p></body>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// One-click unsubscribe (RFC 8058) posts to the same URL.
export const POST = GET
