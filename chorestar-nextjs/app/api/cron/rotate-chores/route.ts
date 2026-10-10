import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { rotationChanges, sundayOf, type RotationMember } from '@/lib/utils/chore-rotation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/rotate-chores (Vercel Cron, daily; vercel.json)
 *
 * Moves each rotating chore to whoever's turn it is this week, in the
 * family's timezone. Idempotent and deterministic (the week number and the
 * group's start week decide), so a repeat or stray call changes nothing.
 */
export async function GET() {
  const admin = createServiceRoleClient() as any
  const { data: chores, error } = await admin
    .from('chores')
    .select('id, child_id, is_active, rotation_group_id, rotation_order, rotation_start_week')
    .eq('rotation_mode', 'rotate')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = RotationMember & { child_id: string; rotation_group_id: string; rotation_start_week: string }
  const groups = new Map<string, Row[]>()
  for (const c of (chores ?? []) as Row[]) {
    const list = groups.get(c.rotation_group_id) ?? []
    list.push(c)
    groups.set(c.rotation_group_id, list)
  }

  const childIds = [...new Set(((chores ?? []) as Row[]).map((c) => c.child_id))]
  const { data: kids } = childIds.length
    ? await admin.from('children').select('id, user_id').in('id', childIds)
    : { data: [] }
  const ownerOf = new Map<string, string>((kids ?? []).map((k: { id: string; user_id: string }) => [k.id, k.user_id]))
  const owners = [...new Set(ownerOf.values())]
  const { data: settings } = owners.length
    ? await admin.from('family_settings').select('user_id, timezone').in('user_id', owners)
    : { data: [] }
  const tzOf = new Map<string, string>((settings ?? []).map((s: { user_id: string; timezone: string | null }) => [s.user_id, s.timezone || 'UTC']))

  const now = new Date()
  let flipped = 0
  for (const members of groups.values()) {
    const owner = ownerOf.get(members[0].child_id)
    const thisSunday = sundayOf(now, (owner && tzOf.get(owner)) || 'UTC')
    for (const change of rotationChanges(members, members[0].rotation_start_week, thisSunday)) {
      const { error: e } = await admin.from('chores').update({ is_active: change.is_active }).eq('id', change.id)
      if (e) console.error('[rotate-chores]', change.id, e.message)
      else flipped++
    }
  }
  return NextResponse.json({ groups: groups.size, flipped })
}
