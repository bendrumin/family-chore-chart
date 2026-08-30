import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { childTotalEarningsCents, owedCents, type DatedCompletion } from '@/lib/utils/earnings'
import { isPremium } from '@/lib/utils/subscription'
import { FREE_GOAL_LIMIT, FREE_STORE_ITEM_LIMIT } from '@/lib/constants/rewards'

/**
 * The kid's wallet, server-side (migration 011 + 017).
 *
 * Balance is DERIVED on every read: everything ever earned (approved ticks
 * only, through the shared earnings rules) minus everything ever paid out.
 * A stored running total would drift the moment history changed underneath
 * it. Goals measure progress against this balance; store redemptions and goal
 * payouts both spend it by recording a payout row.
 */

export interface Balance {
  childId: string
  earnedCents: number
  paidCents: number
  owedCents: number
}

export interface WalletChild {
  id: string
  name: string
  user_id: string
}

export async function loadChild(childId: string): Promise<WalletChild | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin.from('children').select('id, name, user_id').eq('id', childId).maybeSingle()
  return data ?? null
}

export async function computeBalance(child: WalletChild): Promise<Balance> {
  const admin = createServiceRoleClient()

  const { data: chores } = await admin
    .from('chores')
    .select('id, reward_cents, days_of_week')
    .eq('child_id', child.id)
    .eq('is_active', true)
  const choreList = chores ?? []

  let earned = 0
  if (choreList.length > 0) {
    const [{ data: completions }, { data: settings }] = await Promise.all([
      admin
        .from('chore_completions')
        .select('chore_id, day_of_week, week_start, status')
        .in('chore_id', choreList.map(c => c.id)),
      admin
        .from('family_settings')
        .select('reward_mode, daily_reward_cents, weekly_bonus_cents')
        .eq('user_id', child.user_id)
        .maybeSingle(),
    ])
    earned = childTotalEarningsCents(choreList, (completions ?? []) as DatedCompletion[], settings)
  }

  const { data: payouts } = await admin.from('allowance_payouts').select('amount_cents').eq('child_id', child.id)
  const paid = (payouts ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0)

  return { childId: child.id, earnedCents: earned, paidCents: paid, owedCents: owedCents(earned, paid) }
}

/** Is the family on a paid plan? Drives the goal and store item limits. */
export async function familyIsPremium(ownerUserId: string): Promise<boolean> {
  try {
    const admin = createServiceRoleClient()
    const { data } = await admin.from('profiles').select('subscription_type').eq('id', ownerUserId).maybeSingle()
    return isPremium(data?.subscription_type)
  } catch {
    return false
  }
}

export interface WalletLimits {
  premium: boolean
  /** Active goals a child may hold at once. */
  goalLimit: number
  /** Store items a family may list. */
  storeItemLimit: number
}

export async function walletLimits(ownerUserId: string): Promise<WalletLimits> {
  const premium = await familyIsPremium(ownerUserId)
  return {
    premium,
    goalLimit: premium ? Number.MAX_SAFE_INTEGER : FREE_GOAL_LIMIT,
    storeItemLimit: premium ? Number.MAX_SAFE_INTEGER : FREE_STORE_ITEM_LIMIT,
  }
}

export interface GoalRow {
  id: string
  child_id: string
  title: string
  emoji: string | null
  target_cents: number
  status: string
  reached_at: string | null
  notified_at: string | null
  created_by: string
  created_at: string
}

export async function activeGoal(childId: string): Promise<GoalRow | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('goals')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data as GoalRow | null) ?? null
}

export interface GoalView {
  id: string
  title: string
  emoji: string | null
  targetCents: number
  progressCents: number
  /** 0..100 */
  percent: number
  reached: boolean
  status: string
  reachedAt: string | null
  createdBy: string
}

export function goalView(goal: GoalRow, owed: number): GoalView {
  const progress = Math.min(owed, goal.target_cents)
  return {
    id: goal.id,
    title: goal.title,
    emoji: goal.emoji,
    targetCents: goal.target_cents,
    progressCents: goal.status === 'reached' ? goal.target_cents : progress,
    percent: goal.status === 'reached' ? 100 : Math.round((progress / goal.target_cents) * 100),
    reached: goal.status === 'reached' || owed >= goal.target_cents,
    status: goal.status,
    reachedAt: goal.reached_at,
    createdBy: goal.created_by,
  }
}
