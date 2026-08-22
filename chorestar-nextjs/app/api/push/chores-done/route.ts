import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { notifyIfAllChoresDone } from '@/lib/push/notify'

/**
 * Fire-and-forget "all chores done?" check after a parent (iOS/web) writes a
 * chore_completion directly to Supabase — those paths never hit the kid API,
 * so without this route the parent's phone stays silent.
 *
 * Auth: bearer session. Caller must own the child or be a shared family member.
 */

const bodySchema = z.object({
  childId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    let {
      data: { user },
    } = await supabase.auth.getUser()
    // iOS sends Authorization: Bearer <access token>; web uses the session cookie.
    if (!user) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim()
        if (token) {
          const adminForAuth = createServiceRoleClient()
          const { data: tokenAuth } = await adminForAuth.auth.getUser(token)
          user = tokenAuth?.user ?? null
        }
      }
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { childId, weekStart, dayOfWeek } = parsed.data

    let admin
    try {
      admin = createServiceRoleClient()
    } catch {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: child } = await admin
      .from('children')
      .select('id, user_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    const isOwner = child.user_id === user.id
    if (!isOwner) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membership } = await (admin as any)
        .from('family_members')
        .select('id')
        .eq('family_id', child.user_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    after(() => notifyIfAllChoresDone(childId, weekStart, dayOfWeek))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[push/chores-done]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
