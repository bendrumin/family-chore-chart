import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET /api/family/invite/[code] — fetch invite details (public, no auth required)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: invite, error } = await (admin as any)
      .from('family_invites')
      .select('id, status, expires_at, family_id, profiles:family_id(family_name)')
      .eq('code', code)
      .maybeSingle()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: invite.status,
      familyName: (invite.profiles as any)?.family_name || 'Your family',
      expired: invite.status === 'expired' || new Date(invite.expires_at) < new Date(),
    })
  } catch (error) {
    console.error('Invite lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
