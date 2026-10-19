import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import {
  groupOwnership,
  parseStopSharingAction,
  sharedChorePatch,
  STOP_SHARING_ARCHIVE_UPDATE,
} from '@/lib/utils/shared-chores'

/**
 * Manage a shared chore (migration 025) as one thing: every kid's copy.
 *
 *   PATCH  /api/chores/shared/:groupId
 *     { name?, icon?, rewardCents?, daysOfWeek?, category?, requiresPhoto? }
 *     Applies the edit to every copy, active or not (the inactive copies are
 *     the kids whose turn it isn't this week).
 *
 *   DELETE /api/chores/shared/:groupId?action=archive|delete
 *     "Stop sharing". archive: every copy goes inactive and the group leaves
 *     the rotation job, so nothing comes back on another kid tomorrow; past
 *     earnings keep counting. delete: every copy and its history is removed.
 *
 * Parent auth (cookie or Bearer), resolved to the family owner so co-parents
 * can manage it too. Writes use the service role, so RLS on the inactive
 * copies doesn't matter; ownership is checked here instead. Not gated on
 * Premium: a lapsed family must still be able to edit or stop what it has.
 */

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    icon: z.string().trim().max(16).optional().nullable(),
    rewardCents: z.number().int().min(0).max(100_000).optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
    category: z.string().trim().max(40).optional().nullable(),
    requiresPhoto: z.boolean().optional(),
  })
  .strict()

const groupIdSchema = z.string().uuid()

type Admin = any

async function authorize(request: Request, groupId: string) {
  const userId = await getParentUserId(request)
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!groupIdSchema.safeParse(groupId).success) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  const admin = createServiceRoleClient() as Admin
  const { effectiveUserId: ownerId } = await getEffectiveFamilyId(admin, userId)

  const [{ data: rows, error }, { data: kids }] = await Promise.all([
    admin.from('chores').select('id, child_id').eq('rotation_group_id', groupId),
    admin.from('children').select('id').eq('user_id', ownerId),
  ])
  if (error) {
    console.error('[chores/shared/:groupId] lookup failed:', error.message)
    return { error: NextResponse.json({ error: 'Could not load the chore' }, { status: 500 }) }
  }
  const verdict = groupOwnership(rows ?? [], (kids ?? []).map((k: { id: string }) => k.id))
  if (verdict !== 'ok') {
    // Same answer either way, so a group id from another family reveals nothing.
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { admin, ids: (rows as { id: string }[]).map((r) => r.id) }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const auth = await authorize(request, groupId)
  if ('error' in auth) return auth.error

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const patch = sharedChorePatch(parsed.data)
  if (Object.keys(patch).length === 0) return NextResponse.json({ updated: 0 })

  const { data, error } = await auth.admin.from('chores').update(patch).in('id', auth.ids).select('id')
  if (error) {
    console.error('[chores/shared/:groupId] update failed:', error.message)
    return NextResponse.json({ error: 'Could not save the chore' }, { status: 500 })
  }
  return NextResponse.json({ updated: (data ?? []).length })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const action = parseStopSharingAction(new URL(request.url).searchParams.get('action'))
  if (!action) return NextResponse.json({ error: 'action must be archive or delete' }, { status: 400 })

  const auth = await authorize(request, groupId)
  if ('error' in auth) return auth.error

  const query =
    action === 'delete'
      ? auth.admin.from('chores').delete().in('id', auth.ids).select('id')
      : auth.admin.from('chores').update(STOP_SHARING_ARCHIVE_UPDATE).in('id', auth.ids).select('id')
  const { data, error } = await query
  if (error) {
    console.error(`[chores/shared/:groupId] ${action} failed:`, error.message)
    return NextResponse.json({ error: 'Could not stop sharing that chore' }, { status: 500 })
  }
  return NextResponse.json({ action, chores: (data ?? []).length })
}
