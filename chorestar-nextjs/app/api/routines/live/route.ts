import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { isFamilyPremium } from '@/lib/routines/server'
import { STALE_AFTER_MS, type LiveRoutine } from '@/lib/routines/live-progress'

/**
 * GET /api/routines/live — routines a kid is in the middle of right now, for
 * the parent dashboard (migration 032).
 *
 * Premium families get the step ("Maya is on step 3 of 6 — Brush teeth").
 * Free families get only that a routine is underway, with `locked: true`, so
 * the dashboard can show an upgrade hint instead of the detail.
 */
export async function GET(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const empty = NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } })

  try {
    const admin = createServiceRoleClient()
    const families = await familiesForUser(userId)

    const { data: children } = await admin
      .from('children')
      .select('id, name, avatar_color, user_id')
      .in('user_id', families)
    const childList = children ?? []
    if (childList.length === 0) return empty

    const since = new Date(Date.now() - STALE_AFTER_MS).toISOString()
    const { data: rows, error } = await admin
      .from('routine_progress')
      .select('routine_id, child_id, current_step_index, steps_total, current_step_title, started_at, updated_at')
      .in('child_id', childList.map(c => c.id))
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(20)
    // No table yet (032 not applied) or nothing running.
    if (error || !rows || rows.length === 0) return empty

    const { data: routines } = await admin
      .from('routines')
      .select('id, name, color')
      .in('id', rows.map(r => r.routine_id))
    const routineById = new Map((routines ?? []).map(r => [r.id, r]))
    const childById = new Map(childList.map(c => [c.id, c]))

    const premiumByOwner = new Map<string, boolean>()
    for (const owner of new Set(childList.map(c => c.user_id))) {
      premiumByOwner.set(owner, await isFamilyPremium(owner, admin))
    }

    const items: LiveRoutine[] = rows.flatMap(r => {
      const child = childById.get(r.child_id)
      const routine = routineById.get(r.routine_id)
      if (!child || !routine) return []
      const locked = !premiumByOwner.get(child.user_id)
      const base: LiveRoutine = {
        routineId: r.routine_id,
        routineName: routine.name,
        routineColor: routine.color ?? null,
        childId: child.id,
        childName: child.name,
        childColor: child.avatar_color ?? null,
        startedAt: r.started_at,
        updatedAt: r.updated_at,
        locked,
      }
      return [
        locked
          ? base
          : {
              ...base,
              stepIndex: r.current_step_index,
              stepsTotal: r.steps_total,
              stepTitle: r.current_step_title,
            },
      ]
    })

    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[routines/live] Unexpected error:', error)
    return empty
  }
}
