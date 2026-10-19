/* eslint-disable @typescript-eslint/no-explicit-any -- child_pets (034) is newer than the generated types */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { loadFamilyPetContext, loadPetStates } from '@/lib/pets/server'

/**
 * Star Pets, from the parent's side (migration 034). Owner or co-parent, web
 * session or a native app's Bearer token.
 *
 * GET  /api/pets
 *   { premium, kids: [{ childId, childName, pet }] } in the family's order:
 *   the dashboard preview and the Settings switches read this. `pet` is the
 *   same derived state the kid sees (lib/pets/state.ts).
 *
 * POST /api/pets  { childId, enabled }
 *   The per-kid on/off switch. Never Premium-gated (the basic pet is free,
 *   and switching anything off is always allowed). Off hides the pet; nothing
 *   is deleted, so switching back on brings the same pet back.
 */

const toggleSchema = z.object({ childId: z.string().uuid(), enabled: z.boolean() })

async function ownerFor(request: Request): Promise<string | null> {
  const userId = await getParentUserId(request)
  if (!userId) return null
  const admin = createServiceRoleClient() as any
  const { effectiveUserId } = await getEffectiveFamilyId(admin, userId)
  return effectiveUserId
}

export async function GET(request: Request) {
  const ownerId = await ownerFor(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = createServiceRoleClient()
    const { data: kids } = await admin
      .from('children')
      .select('id, name')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: true })
    const list = kids ?? []
    const ctx = await loadFamilyPetContext(ownerId)
    const states = await loadPetStates(ctx, list.map(k => k.id))
    return NextResponse.json(
      {
        premium: ctx.premium,
        kids: list.map(k => ({ childId: k.id, childName: k.name, pet: states.get(k.id) ?? null })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[pets] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ownerId = await ownerFor(request)
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = toggleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  try {
    const admin = createServiceRoleClient() as any
    const { data: child } = await admin
      .from('children')
      .select('id')
      .eq('id', parsed.data.childId)
      .eq('user_id', ownerId)
      .maybeSingle()
    if (!child) return NextResponse.json({ error: 'Not in your family' }, { status: 404 })

    const { error } = await admin
      .from('child_pets')
      .upsert(
        { child_id: child.id, enabled: parsed.data.enabled, updated_at: new Date().toISOString() },
        { onConflict: 'child_id' }
      )
    if (error) {
      console.error('[pets] toggle failed:', error.message)
      return NextResponse.json({ error: 'Could not save. Has migration 034 been applied?' }, { status: 500 })
    }
    return NextResponse.json({ childId: child.id, enabled: parsed.data.enabled })
  } catch (error) {
    console.error('[pets] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
