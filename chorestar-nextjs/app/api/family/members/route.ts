import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET /api/family/members — list current members + pending invites
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  // Get accepted members
  const { data: members } = await (admin as any)
    .from('family_members')
    .select('user_id, created_at, profiles:user_id(email, family_name)')
    .eq('family_id', user.id)

  // Get pending invites
  const { data: invites } = await (admin as any)
    .from('family_invites')
    .select('id, invited_email, created_at, expires_at')
    .eq('family_id', user.id)
    .eq('status', 'pending')

  return NextResponse.json({
    members: members || [],
    pendingInvites: invites || [],
  })
}

// DELETE /api/family/members — remove a family member
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
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
}
