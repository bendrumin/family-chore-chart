import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveKidRequest } from '@/lib/utils/kid-or-parent-auth'
import { loadKidChallenges } from '@/lib/challenges/server'
import { describeTarget } from '@/lib/challenges/progress'

/**
 * GET /api/kid/challenges[?childId=...] — the family challenges this kid is
 * part of (migration 031), with team progress and every teammate's part.
 *
 * Kid token, or a parent's session naming the child (kid mode on a parent's
 * device), like /api/kid/wallet. Progress is derived from completions on
 * every read (lib/challenges/progress.ts). Teammates are listed in the
 * family's own order, never ranked.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ctx = await resolveKidRequest(request, url.searchParams.get('childId'))
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const { child } = ctx
    const admin = createServiceRoleClient()
    const [list, kidsRes, settingsRes] = await Promise.all([
      loadKidChallenges(child.id, child.user_id),
      admin
        .from('children')
        .select('id, name, avatar_color, avatar_file')
        .eq('user_id', child.user_id)
        .order('created_at', { ascending: true }),
      admin.from('family_settings').select('currency_code').eq('user_id', child.user_id).maybeSingle(),
    ])
    const kids = new Map((kidsRes.data ?? []).map(k => [k.id, k]))

    const challenges = list.map(({ challenge, progress, phase, daysLeft }) => ({
      id: challenge.id,
      title: challenge.title,
      emoji: challenge.emoji,
      rewardText: challenge.reward_text,
      rewardCents: challenge.reward_cents,
      metric: challenge.metric,
      mode: challenge.mode,
      target: challenge.target,
      routineType: challenge.routine_type ?? null,
      choreFilter: challenge.chore_filter ?? 'any',
      description: describeTarget(challenge),
      startsOn: challenge.starts_on,
      endsOn: challenge.ends_on,
      phase,
      daysLeft,
      current: progress.current,
      goal: progress.goal,
      percent: progress.percent,
      met: progress.met,
      remaining: progress.remaining,
      teammates: progress.kids
        .filter(k => kids.has(k.childId))
        .map(k => {
          const kid = kids.get(k.childId)!
          return {
            childId: k.childId,
            name: kid.name,
            avatarColor: kid.avatar_color,
            avatarEmoji: kid.avatar_file,
            count: k.count,
            done: k.done,
            toGo: k.toGo,
            isMe: k.childId === child.id,
          }
        }),
    }))

    return NextResponse.json({
      childId: child.id,
      currencyCode: settingsRes.data?.currency_code ?? 'USD',
      challenges,
    })
  } catch (error) {
    console.error('[kid/challenges] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
