import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET /api/family/members — list current members + pending invites
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: members, error: membersError } = await (admin as any)
      .from('family_members')
      .select('user_id, created_at, profiles:user_id(email, family_name)')
      .eq('family_id', user.id)

    if (membersError) {
      console.error('Failed to fetch family members:', membersError)
    }

    const { data: invites, error: invitesError } = await (admin as any)
      .from('family_invites')
      .select('id, invited_email, created_at, expires_at')
      .eq('family_id', user.id)
      .eq('status', 'pending')

    if (invitesError) {
      console.error('Failed to fetch invites:', invitesError)
    }

    return NextResponse.json({
      members: members || [],
      pendingInvites: invites || [],
    })
  } catch (error) {
    console.error('Family members GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/family/members — remove a family member
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { error } = await (admin as any)
      .from('family_members')
      .delete()
      .eq('family_id', user.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to remove member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Family members DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
