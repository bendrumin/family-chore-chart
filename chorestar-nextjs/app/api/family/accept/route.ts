import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/family/accept — accept a family invite
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 })
    }

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: invite, error: lookupError } = await (admin as any)
      .from('family_invites')
      .select('id, family_id, status, expires_at, invited_email')
      .eq('code', code)
      .maybeSingle()

    if (lookupError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite already used or expired' }, { status: 410 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      await (admin as any)
        .from('family_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id)
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
    }

    if (invite.family_id === user.id) {
      return NextResponse.json({ error: 'You cannot join your own family' }, { status: 400 })
    }

    // Verify the accepting user's email matches the invite
    if (user.email?.toLowerCase() !== invite.invited_email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 403 }
      )
    }

    const { error: memberError } = await (admin as any)
      .from('family_members')
      .upsert(
        { user_id: user.id, family_id: invite.family_id },
        { onConflict: 'user_id,family_id' }
      )

    if (memberError) {
      console.error('Failed to create family member:', memberError)
      return NextResponse.json({ error: 'Failed to join family' }, { status: 500 })
    }

    await (admin as any)
      .from('family_invites')
      .update({ status: 'accepted', accepted_by: user.id })
      .eq('id', invite.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Family accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
