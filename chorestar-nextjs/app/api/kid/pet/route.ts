/* eslint-disable @typescript-eslint/no-explicit-any -- child_pets / child_pet_cosmetics (034) are newer than the generated types */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveKidRequest } from '@/lib/utils/kid-or-parent-auth'
import { loadPetState } from '@/lib/pets/server'
import { PET_SLOTS, PET_SPECIES_IDS, getPetItem } from '@/lib/pets/catalog'
import { canEquip, cleanPetName, speciesAllowed } from '@/lib/pets/unlocks'

/**
 * Star Pets, from the kid's side (migration 034). Kid token, or a parent's
 * session naming the child (kid mode on a parent's device), like
 * /api/kid/challenges.
 *
 * GET  /api/kid/pet[?childId=]
 *   The pet with everything derived right now (lib/pets): XP, level, stage,
 *   star form, mood, the wardrobe and this month's drop. `pet.enabled` false
 *   means a parent switched pets off for this kid: show nothing.
 *
 * POST /api/kid/pet  { childId?, action, ... }
 *   adopt         { species, name }   pick (or swap) the species and name it.
 *                                      Free plan: FREE_SPECIES only.
 *   rename        { name }
 *   equip         { slot, itemId|null } Premium; level item reached or drop owned.
 *                                      Taking something off is always allowed.
 *   collect_drop  {}                   Premium; this month's drop once this
 *                                      month's XP reaches the goal. Wears it too.
 *
 * Every Premium rule is checked here, so it holds for any client; the table
 * itself is server-write only. Answers 403 `premium_required` with no
 * purchase details: kids can't buy, the kid UI says "ask a grown-up".
 */

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('adopt'), childId: z.string().uuid().optional(), species: z.enum(PET_SPECIES_IDS), name: z.string() }),
  z.object({ action: z.literal('rename'), childId: z.string().uuid().optional(), name: z.string() }),
  z.object({
    action: z.literal('equip'),
    childId: z.string().uuid().optional(),
    slot: z.enum(PET_SLOTS),
    itemId: z.string().max(40).nullable(),
  }),
  z.object({ action: z.literal('collect_drop'), childId: z.string().uuid().optional() }),
])

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ctx = await resolveKidRequest(request, url.searchParams.get('childId'))
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const { state } = await loadPetState(ctx.child.user_id, ctx.child.id)
    return NextResponse.json({ childId: ctx.child.id, pet: state }, { headers: NO_STORE })
  } catch (error) {
    console.error('[kid/pet] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const body = parsed.data
  const ctx = await resolveKidRequest(request, body.childId ?? null)
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const admin = createServiceRoleClient() as any
    const childId = ctx.child.id
    const { ctx: family, state } = await loadPetState(ctx.child.user_id, childId)
    if (!state) return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    if (!state.enabled) return NextResponse.json({ error: 'pets_off' }, { status: 403 })
    const premium = family.premium

    if (body.action === 'adopt') {
      const name = cleanPetName(body.name)
      if (!name) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
      if (!speciesAllowed(body.species, premium)) {
        return NextResponse.json({ error: 'premium_required' }, { status: 403 })
      }
      // Swapping species keeps the adoption day, so growth is never reset.
      const { error } = await admin.from('child_pets').upsert(
        {
          child_id: childId,
          species: body.species,
          name,
          adopted_on: state.adoptedOn ?? family.today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'child_id' }
      )
      if (error) throw new Error(error.message)
    } else {
      if (!state.adopted) return NextResponse.json({ error: 'not_adopted' }, { status: 409 })

      if (body.action === 'rename') {
        const name = cleanPetName(body.name)
        if (!name) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
        const { error } = await admin.from('child_pets').update({ name, updated_at: new Date().toISOString() }).eq('child_id', childId)
        if (error) throw new Error(error.message)
      } else if (body.action === 'equip') {
        if (body.itemId !== null) {
          if (!premium) return NextResponse.json({ error: 'premium_required' }, { status: 403 })
          const owned = new Set(state.wardrobe.filter(w => w.month !== null).map(w => w.id))
          if (!canEquip(body.itemId, body.slot, { premium, level: state.trueLevel, owned })) {
            return NextResponse.json({ error: 'locked' }, { status: 409 })
          }
        }
        const { error } = await admin
          .from('child_pets')
          .update({ [body.slot]: body.itemId, updated_at: new Date().toISOString() })
          .eq('child_id', childId)
        if (error) throw new Error(error.message)
      } else {
        if (!premium) return NextResponse.json({ error: 'premium_required' }, { status: 403 })
        const drop = state.drop
        if (!drop || drop.owned) return NextResponse.json({ error: 'already_collected' }, { status: 409 })
        if (!drop.collectible) return NextResponse.json({ error: 'not_yet' }, { status: 409 })
        const item = getPetItem(drop.itemId)
        if (!item) return NextResponse.json({ error: 'not_yet' }, { status: 409 })
        const { error } = await admin
          .from('child_pet_cosmetics')
          .upsert(
            { child_id: childId, item_id: item.id, source: 'drop', drop_month: drop.monthKey },
            { onConflict: 'child_id,item_id', ignoreDuplicates: true }
          )
        if (error) throw new Error(error.message)
        await admin
          .from('child_pets')
          .update({ [item.slot]: item.id, updated_at: new Date().toISOString() })
          .eq('child_id', childId)
      }
    }

    const { state: next } = await loadPetState(ctx.child.user_id, childId)
    return NextResponse.json({ childId, pet: next }, { headers: NO_STORE })
  } catch (error) {
    console.error('[kid/pet] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
