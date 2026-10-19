import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { resolveKidRequest } from '@/lib/utils/kid-or-parent-auth'
import { computeBalance, computeMinutes, recentLedger, activeGoals, goalView, walletLimits, type GoalRow } from '@/lib/utils/wallet'
import { notifyGoalReached } from '@/lib/push/notify'

/**
 * GET /api/kid/wallet[?childId=...] — the kid's money, in one call.
 *
 * Balance (unspent allowance), the active goal with progress, recently reached
 * goals, the family's reward store with what is affordable right now and any
 * requests still waiting, and the plan limits the UI needs to show "1 goal on
 * the free plan". Kid token, or a parent's session naming the child.
 *
 * Premium money (migration 030): the Spend / Save / Give jars, screen-time
 * minutes, and the latest money news (allowance paid, interest, fines). With
 * jars on, the store spends from Spend and goals fill from Save.
 *
 * Also the one place the "reached your goal" alert fires: the kid dashboard
 * fetches this constantly, and the goal row remembers it was sent.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ctx = await resolveKidRequest(request, url.searchParams.get('childId'))
  if (!ctx) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  try {
    const admin = createServiceRoleClient()
    const { child } = ctx

    const limits = await walletLimits(child.user_id)
    const [balance, goals, settingsRes, itemsRes, reachedRes, pendingRes, minutes, ledger] = await Promise.all([
      computeBalance(child, { premium: limits.premium }),
      activeGoals(child.id),
      admin.from('family_settings').select('currency_code').eq('user_id', child.user_id).maybeSingle(),
      admin
        .from('reward_items')
        .select('id, title, emoji, price_cents, sort_order')
        .eq('user_id', child.user_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('price_cents', { ascending: true }),
      admin
        .from('goals')
        .select('*')
        .eq('child_id', child.id)
        .eq('status', 'reached')
        .order('reached_at', { ascending: false })
        .limit(5),
      admin
        .from('reward_redemptions')
        .select('id, reward_item_id, price_cents, requested_at, status')
        .eq('child_id', child.id)
        .eq('status', 'pending'),
      // Money features are Premium; a free family's kid sees none of them.
      limits.premium ? computeMinutes(child.id) : Promise.resolve(null),
      limits.premium ? recentLedger(child.id, 8) : Promise.resolve([]),
    ])

    const owed = balance.owedCents
    // The store spends from Spend when jars are on; goals fill from Save.
    const spendable = balance.spendableCents
    const goalBase = balance.goalBaseCents
    const pending = pendingRes.data ?? []
    const pendingByItem = new Map(pending.map(p => [p.reward_item_id, p.id]))

    const store = (itemsRes.data ?? []).map(item => ({
      id: item.id,
      title: item.title,
      emoji: item.emoji,
      priceCents: item.price_cents,
      affordable: spendable >= item.price_cents,
      shortByCents: Math.max(0, item.price_cents - spendable),
      pendingRequestId: pendingByItem.get(item.id) ?? null,
    }))

    const goalsOut = goals.map(g => goalView(g, goalBase))

    // First time the balance covers a target: tell the parent, once per goal.
    for (const goal of goals) {
      if (goalBase < goal.target_cents || goal.notified_at) continue
      after(async () => {
        try {
          await admin.from('goals').update({ notified_at: new Date().toISOString() }).eq('id', goal.id)
          await notifyGoalReached(child.id, goal.title)
        } catch {
          // Decoration only.
        }
      })
    }

    return NextResponse.json(
      {
        childId: child.id,
        actor: ctx.actor,
        owedCents: owed,
        earnedCents: balance.earnedCents,
        paidCents: balance.paidCents,
        // Signed: below zero means the kid owes a parent (a fine the parent
        // allowed to go negative).
        balanceCents: balance.balanceCents,
        spendableCents: spendable,
        jars: balance.jars,
        minutes: minutes ? { balance: minutes.balanceMinutes, earned: minutes.earnedMinutes, used: minutes.usedMinutes } : null,
        moneyNews: ledger,
        currencyCode: settingsRes.data?.currency_code ?? 'USD',
        // `goal` (the oldest) stays for iOS builds up to 2.4, which read one goal.
        goal: goalsOut[0] ?? null,
        goals: goalsOut,
        reachedGoals: ((reachedRes.data ?? []) as GoalRow[]).map(g => goalView(g, goalBase)),
        store,
        pendingRedemptions: pending.map(p => ({
          id: p.id,
          itemId: p.reward_item_id,
          priceCents: p.price_cents,
          requestedAt: p.requested_at,
        })),
        limits: {
          premium: limits.premium,
          goalLimit: limits.premium ? null : limits.goalLimit,
          storeItemLimit: limits.premium ? null : limits.storeItemLimit,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[kid/wallet] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
