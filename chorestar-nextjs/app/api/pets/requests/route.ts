/* eslint-disable @typescript-eslint/no-explicit-any -- pet_requests (039) is newer than the generated types */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'

/**
 * POST /api/pets/requests  { requestId, action: 'dismiss' }
 *
 * A parent's "Not now" on a kid's Star Pet ask (migration 039). Saying yes
 * isn't an action here: it's buying Premium, after which the pending list
 * closes the ask as granted and the kid adopts the pet themselves. Owner or
 * co-parent, only for a kid in one of their families.
 */
const schema = z.object({ requestId: z.string().uuid(), action: z.literal('dismiss') })

export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  try {
    const admin = createServiceRoleClient() as any
    const { data: req } = await admin
      .from('pet_requests')
      .select('id, child_id, status')
      .eq('id', parsed.data.requestId)
      .maybeSingle()
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: child } = await admin.from('children').select('user_id').eq('id', req.child_id).maybeSingle()
    const families = await familiesForUser(userId)
    if (!child || !families.includes(child.user_id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (req.status === 'pending') {
      const { error } = await admin
        .from('pet_requests')
        .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
        .eq('id', req.id)
      if (error) throw new Error(error.message)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[pets/requests] dismiss failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
