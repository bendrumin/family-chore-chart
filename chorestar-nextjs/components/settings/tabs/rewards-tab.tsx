'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/lib/contexts/settings-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Gift, Plus, Trash2, Target, Sparkles, Check, Archive, Lock } from 'lucide-react'
import { formatMoney, currencySymbol, amountToCents, sanitizeAmountInput } from '@/lib/constants/currencies'
import { STARTER_REWARD_ITEMS, FREE_STORE_ITEM_LIMIT, GOAL_EMOJIS, GOAL_MAX_CENTS } from '@/lib/constants/rewards'
import { isPremium } from '@/lib/utils/subscription'
import type { Database } from '@/lib/supabase/database.types'
import type { Child } from '@/lib/types'

type RewardItem = Database['public']['Tables']['reward_items']['Row']
type Goal = Database['public']['Tables']['goals']['Row']

/**
 * Settings › Rewards: the family's store and each kid's goal (2.0).
 *
 * Store items and goals are written through the normal RLS client (owner or
 * shared family member). Paying out toward a goal goes through /api/allowance,
 * which recomputes what is owed on the server.
 */
export function RewardsTab() {
  const { settings } = useSettings()
  const familyId = settings?.user_id ?? null
  const currency = settings?.currency_code ?? 'USD'
  const symbol = currencySymbol(currency)

  const [items, setItems] = useState<RewardItem[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [premium, setPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  const [newTitle, setNewTitle] = useState('')
  const [newEmoji, setNewEmoji] = useState('🎁')
  const [newPrice, setNewPrice] = useState('2.00')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!familyId) return
    try {
      const supabase = createClient()
      const [{ data: itemRows }, { data: kids }, { data: goalRows }, { data: profile }] = await Promise.all([
        supabase.from('reward_items').select('*').eq('user_id', familyId).eq('is_active', true).order('sort_order').order('price_cents'),
        supabase.from('children').select('*').eq('user_id', familyId).order('created_at'),
        supabase.from('goals').select('*').in('status', ['active', 'reached']).order('created_at', { ascending: false }),
        supabase.from('profiles').select('subscription_type').eq('id', familyId).maybeSingle(),
      ])
      setItems(itemRows ?? [])
      setChildren((kids ?? []) as Child[])
      setGoals(goalRows ?? [])
      setPremium(isPremium(profile?.subscription_type))

      const owed: Record<string, number> = {}
      await Promise.all(
        (kids ?? []).map(async k => {
          try {
            const res = await fetch(`/api/allowance?childId=${k.id}`)
            if (res.ok) {
              const data = await res.json()
              owed[k.id] = data.owedCents ?? 0
            }
          } catch {
            // leave unknown
          }
        })
      )
      setBalances(owed)
    } catch (error) {
      console.error('Rewards tab load failed:', error)
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => { void load() }, [load])

  const limit = premium ? Infinity : FREE_STORE_ITEM_LIMIT
  const atLimit = items.length >= limit

  const addItem = async (title: string, emoji: string, priceCents: number) => {
    if (!familyId) return
    if (items.length >= limit) {
      toast.error(`The free plan lists ${FREE_STORE_ITEM_LIMIT} rewards. Premium removes the limit.`)
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('reward_items').insert({
      user_id: familyId,
      title,
      emoji,
      price_cents: priceCents,
      sort_order: items.length,
    })
    if (error) throw error
  }

  const handleAdd = async () => {
    const cents = amountToCents(sanitizeAmountInput(newPrice))
    if (!newTitle.trim() || !cents || cents <= 0) {
      toast.error('Give the reward a name and a price')
      return
    }
    setSaving(true)
    try {
      await addItem(newTitle.trim(), newEmoji, cents)
      toast.success(`Added ${newEmoji} ${newTitle.trim()}`)
      setNewTitle('')
      await load()
    } catch {
      toast.error('Could not add that reward')
    } finally {
      setSaving(false)
    }
  }

  const addStarterSet = async () => {
    setSaving(true)
    try {
      const room = Math.max(0, limit - items.length)
      const picks = STARTER_REWARD_ITEMS.filter(s => !items.some(i => i.title === s.title)).slice(0, room)
      for (const s of picks) await addItem(s.title, s.emoji, s.price_cents)
      toast.success(picks.length ? `Added ${picks.length} starter rewards` : 'Nothing new to add')
      await load()
    } catch {
      toast.error('Could not add the starter set')
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (item: RewardItem) => {
    const supabase = createClient()
    // Soft delete keeps history (payouts reference the item).
    const { error } = await supabase.from('reward_items').update({ is_active: false }).eq('id', item.id)
    if (error) {
      toast.error('Could not remove that reward')
      return
    }
    toast(`Removed ${item.title}`)
    await load()
  }

  const updatePrice = async (item: RewardItem, raw: string) => {
    const cents = amountToCents(sanitizeAmountInput(raw))
    if (!cents || cents <= 0 || cents === item.price_cents) return
    const supabase = createClient()
    const { error } = await supabase.from('reward_items').update({ price_cents: cents, updated_at: new Date().toISOString() }).eq('id', item.id)
    if (error) toast.error('Could not update the price')
    else await load()
  }

  const goalsByChild = useMemo(() => {
    const map = new Map<string, Goal[]>()
    for (const g of goals) {
      const list = map.get(g.child_id) ?? []
      list.push(g)
      map.set(g.child_id, list)
    }
    return map
  }, [goals])

  const payOutGoal = async (child: Child, goal: Goal) => {
    try {
      const res = await fetch('/api/allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: child.id, goalId: goal.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      toast.success(`Paid ${child.name} ${formatMoney(data.paidCents, currency)} for ${goal.emoji ?? ''} ${goal.title}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'failed' ? e.message : 'Could not record the payout')
    }
  }

  const archiveGoal = async (goal: Goal) => {
    const supabase = createClient()
    const { error } = await supabase.from('goals').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', goal.id)
    if (error) toast.error('Could not archive that goal')
    else await load()
  }

  const setGoalForChild = async (child: Child, title: string, emoji: string, cents: number) => {
    const supabase = createClient()
    const active = (goalsByChild.get(child.id) ?? []).filter(g => g.status === 'active')
    if (active.length >= 1 && !premium) {
      toast.error('One active goal per child on the free plan. Archive the current one first.')
      return
    }
    const { error } = await supabase.from('goals').insert({
      child_id: child.id,
      title,
      emoji,
      target_cents: cents,
      created_by: 'parent',
    })
    if (error) toast.error('Could not save the goal')
    else {
      toast.success(`${child.name} is now saving for ${emoji} ${title}`)
      await load()
    }
  }

  if (!familyId) return null

  return (
    <div className="space-y-8">
      {/* Store */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Reward Store</h3>
          <span className="ml-auto text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {items.length}{premium ? '' : ` / ${FREE_STORE_ITEM_LIMIT}`} rewards
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Things money cannot buy, priced in {symbol}. Kids ask from their dashboard; you say yes or no from the Needs your OK tray, and the price comes off their balance.
        </p>

        {loading ? (
          <div className="h-24 rounded-xl animate-pulse bg-gray-100 dark:bg-gray-800" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center space-y-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No rewards yet. Start with a few families like, then make them yours.</p>
            <Button variant="gradient" onClick={addStarterSet} disabled={saving} className="font-bold">
              <Sparkles className="w-4 h-4 mr-2" /> Add the starter set
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(item => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2"
                style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}
              >
                <span className="text-2xl w-9 text-center" aria-hidden>{item.emoji ?? '🎁'}</span>
                <span className="flex-1 font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <label className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  <span>{symbol}</span>
                  <input
                    defaultValue={(item.price_cents / 100).toFixed(2)}
                    onBlur={e => void updatePrice(item, e.target.value)}
                    inputMode="decimal"
                    aria-label={`Price for ${item.title}`}
                    className="w-20 h-9 rounded-lg border px-2 text-right tabular-nums bg-transparent"
                    style={{ borderColor: 'hsl(var(--border))', color: 'var(--text-primary)' }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void removeItem(item)}
                  className="min-w-[40px] min-h-[40px] grid place-items-center rounded-lg text-gray-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  aria-label={`Remove ${item.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add */}
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(var(--border))', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between">
            <Label className="font-bold" style={{ color: 'var(--text-primary)' }}>Add a reward</Label>
            {items.length > 0 && !atLimit && (
              <button type="button" onClick={addStarterSet} disabled={saving} className="text-xs font-semibold underline" style={{ color: 'var(--primary)' }}>
                Add more from the starter set
              </button>
            )}
          </div>
          {atLimit ? (
            <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Lock className="w-4 h-4" /> The free plan lists {FREE_STORE_ITEM_LIMIT} rewards. Premium removes the limit.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                aria-label="Reward emoji"
                className="h-11 rounded-lg border px-2 text-xl bg-transparent"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                {['🎁', '📱', '🌙', '🎬', '🍕', '🍦', '🎲', '🧸', '🎮', '🏊', '🚲', '📚', '⭐'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value.slice(0, 60))}
                placeholder="30 minutes of screen time"
                aria-label="Reward name"
                className="flex-1 min-w-[180px] h-11"
              />
              <div className="flex items-center gap-1">
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{symbol}</span>
                <Input
                  value={newPrice}
                  onChange={e => setNewPrice(sanitizeAmountInput(e.target.value))}
                  inputMode="decimal"
                  aria-label="Reward price"
                  className="w-24 h-11 text-right tabular-nums"
                />
              </div>
              <Button variant="gradient" onClick={handleAdd} disabled={saving} className="font-bold h-11">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Goals */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Goals</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          What each kid is saving for. Kids can pick their own goal from their dashboard; you can set or change it here. When the balance covers the target, pay it out and the goal is done.
        </p>

        {children.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Add a child first.</p>
        ) : (
          <div className="space-y-3">
            {children.map(child => (
              <ChildGoalRow
                key={child.id}
                child={child}
                goals={goalsByChild.get(child.id) ?? []}
                owedCents={balances[child.id]}
                currency={currency}
                premium={premium}
                onPayOut={goal => payOutGoal(child, goal)}
                onArchive={archiveGoal}
                onCreate={(title, emoji, cents) => setGoalForChild(child, title, emoji, cents)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ChildGoalRow({
  child,
  goals,
  owedCents,
  currency,
  premium,
  onPayOut,
  onArchive,
  onCreate,
}: {
  child: Child
  goals: Goal[]
  owedCents: number | undefined
  currency: string
  premium: boolean
  onPayOut: (goal: Goal) => Promise<void>
  onArchive: (goal: Goal) => Promise<void>
  onCreate: (title: string, emoji: string, cents: number) => Promise<void>
}) {
  const active = goals.filter(g => g.status === 'active')
  const reached = goals.filter(g => g.status === 'reached')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState<string>(GOAL_EMOJIS[0])
  const [amount, setAmount] = useState('20.00')
  const [busy, setBusy] = useState(false)
  const symbol = currencySymbol(currency)
  const owed = owedCents ?? 0

  const create = async () => {
    const cents = amountToCents(sanitizeAmountInput(amount))
    if (!title.trim() || !cents || cents < 100 || cents > GOAL_MAX_CENTS) {
      toast.error('Give the goal a name and an amount (at least 1.00)')
      return
    }
    setBusy(true)
    try {
      await onCreate(title.trim(), emoji, cents)
      setAdding(false)
      setTitle('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-bold" style={{ color: child.avatar_color || 'var(--text-primary)' }}>{child.name}</div>
        <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          {owedCents === undefined ? '' : `${formatMoney(owed, currency)} unspent`}
        </div>
      </div>

      {active.map(goal => {
        const progress = Math.min(owed, goal.target_cents)
        const pct = Math.round((progress / goal.target_cents) * 100)
        const done = owed >= goal.target_cents
        return (
          <div key={goal.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>{goal.emoji ?? '🎯'}</span>
              <span className="font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {formatMoney(progress, currency)} / {formatMoney(goal.target_cents, currency)}
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              <div className={`h-full rounded-full ${done ? 'bg-amber-500' : 'accent-fill'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={done ? 'gradient' : 'outline'} onClick={() => onPayOut(goal)} disabled={owed <= 0} className="font-semibold">
                <Check className="w-4 h-4 mr-1" /> {done ? 'Pay out the goal' : `Pay out ${formatMoney(Math.min(owed, goal.target_cents), currency)} toward it`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onArchive(goal)} className="font-semibold">
                <Archive className="w-4 h-4 mr-1" /> Archive
              </Button>
            </div>
          </div>
        )
      })}

      {active.length === 0 && !adding && (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="font-semibold">
          <Plus className="w-4 h-4 mr-1" /> Set a goal for {child.name}
        </Button>
      )}
      {active.length > 0 && premium && !adding && (
        <Button size="sm" variant="ghost" onClick={() => setAdding(true)} className="font-semibold">
          <Plus className="w-4 h-4 mr-1" /> Another goal
        </Button>
      )}

      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
          <select value={emoji} onChange={e => setEmoji(e.target.value)} aria-label="Goal emoji" className="h-10 rounded-lg border px-2 text-xl bg-transparent" style={{ borderColor: 'hsl(var(--border))' }}>
            {GOAL_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <Input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))} placeholder="Lego set" aria-label="Goal name" className="flex-1 min-w-[160px] h-10" />
          <div className="flex items-center gap-1">
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{symbol}</span>
            <Input value={amount} onChange={e => setAmount(sanitizeAmountInput(e.target.value))} inputMode="decimal" aria-label="Goal amount" className="w-24 h-10 text-right tabular-nums" />
          </div>
          <Button size="sm" variant="gradient" onClick={create} disabled={busy} className="font-bold">Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}

      {reached.length > 0 && (
        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          🏆 Reached: {reached.slice(0, 3).map(g => `${g.emoji ?? ''} ${g.title}`).join(', ')}{reached.length > 3 ? ` +${reached.length - 3}` : ''}
        </div>
      )}
    </div>
  )
}
