import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET /api/family/invite/[code] — fetch invite details (public, no auth required)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const admin = createServiceRoleClient()

  const { data: invite, error } = await (admin as any)
    .from('family_invites')
    .select('id, status, invited_email, expires_at, family_id, profiles:family_id(family_name, email)')
    .eq('code', code)
    .maybeSingle()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  return NextResponse.json({
    status: invite.status,
    invitedEmail: invite.invited_email,
    expiresAt: invite.expires_at,
    familyName: (invite.profiles as any)?.family_name || 'Your family',
    familyEmail: (invite.profiles as any)?.email,
    expired: invite.status === 'expired' || new Date(invite.expires_at) < new Date(),
  })
}
