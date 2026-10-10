import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { familyIsPremium } from '@/lib/utils/wallet'
import { sundayOf } from '@/lib/utils/chore-rotation'

/**
 * POST /api/chores/shared  (Premium)
 *   { name, icon?, rewardCents, daysOfWeek, category?, requiresPhoto?, mode: 'rotate' | 'grab', childIds }
 *
 * One chore shared by several kids (migration 025): a copy per kid tied by a
 * rotation group. 'rotate' starts with the first kid this week and moves on
 * every Sunday; 'grab' is a bonus chore the first kid to finish earns.
 */
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(16).optional().nullable(),
  rewardCents: z.number().int().min(0).max(100_000),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  category: z.string().trim().max(40).optional().nullable(),
  requiresPhoto: z.boolean().optional(),
  mode: z.enum(['rotate', 'grab']),
  childIds: z.array(z.string().uuid()).min(2).max(12),
})

export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const body = parsed.data

  const admin = createServiceRoleClient() as any
  const { effectiveUserId: ownerId } = await getEffectiveFamilyId(admin, userId)
  if (!(await familyIsPremium(ownerId))) {
    return NextResponse.json({ error: 'premium_required', message: 'Shared chores are part of Premium.' }, { status: 403 })
  }

  const unique = [...new Set(body.childIds)]
  const { data: kids } = await admin.from('children').select('id').eq('user_id', ownerId).in('id', unique)
  if ((kids ?? []).length !== unique.length) {
    return NextResponse.json({ error: 'Those kids are not all in your family' }, { status: 400 })
  }

  const { data: settings } = await admin.from('family_settings').select('timezone').eq('user_id', ownerId).maybeSingle()
  const startWeek = sundayOf(new Date(), settings?.timezone || 'UTC')
  const groupId = randomUUID()
  const rows = unique.map((childId, i) => ({
    child_id: childId,
    name: body.name,
    icon: body.icon ?? null,
    reward_cents: body.rewardCents,
    days_of_week: [...new Set(body.daysOfWeek)].sort(),
    category: body.category ?? 'household_chores',
    requires_photo: body.requiresPhoto ?? false,
    is_active: body.mode === 'grab' || i === 0,
    rotation_group_id: groupId,
    rotation_mode: body.mode,
    rotation_order: i,
    rotation_start_week: startWeek,
  }))

  const { data, error } = await admin.from('chores').insert(rows).select('id, child_id, is_active')
  if (error) {
    console.error('[chores/shared] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save the chore' }, { status: 500 })
  }
  return NextResponse.json({ groupId, mode: body.mode, chores: data })
}
