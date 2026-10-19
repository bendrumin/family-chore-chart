'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Trophy, Users, Target, CalendarDays, Gift } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CHALLENGE_TEMPLATES, CHALLENGE_EMOJIS, type ChallengeTemplate } from '@/lib/challenges/templates'
import {
  addDays,
  describeTarget,
  todayIn,
  weekWindow,
  type ChallengeChoreFilter,
  type ChallengeMetric,
  type ChallengeMode,
  type ChallengeRoutineType,
} from '@/lib/challenges/progress'
import { amountToCents, currencySymbol, sanitizeAmountInput } from '@/lib/constants/currencies'
import type { Child } from '@/lib/types'

/**
 * Create a family challenge (Premium). One-tap templates fill the form; the
 * parent picks the kids (2+) and can change anything. The window defaults to
 * this week in the family's timezone. Saves through POST /api/challenges,
 * which checks Premium and that every kid is in the family.
 */

const FIELD = 'rounded-xl border-2 p-4 space-y-3 border-gray-200 dark:border-gray-700'
const SELECT =
  'h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export function ChallengeBuilderModal({
  open,
  onOpenChange,
  kids,
  timeZone,
  currencyCode,
  initialTemplate,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kids: Child[]
  timeZone?: string | null
  currencyCode?: string | null
  initialTemplate?: ChallengeTemplate | null
  onCreated: () => void
}) {
  const thisWeek = useMemo(() => weekWindow(todayIn(timeZone)), [timeZone])

  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const [emoji, setEmoji] = useState('🏆')
  const [title, setTitle] = useState('')
  const [rewardText, setRewardText] = useState('')
  const [money, setMoney] = useState('')
  const [metric, setMetric] = useState<ChallengeMetric>('chores')
  const [mode, setMode] = useState<ChallengeMode>('team')
  const [target, setTarget] = useState('20')
  const [choreFilter, setChoreFilter] = useState<ChallengeChoreFilter>('any')
  const [routineType, setRoutineType] = useState<ChallengeRoutineType | ''>('')
  const [childIds, setChildIds] = useState<string[]>([])
  const [startsOn, setStartsOn] = useState(thisWeek.starts_on)
  const [endsOn, setEndsOn] = useState(thisWeek.ends_on)
  const [saving, setSaving] = useState(false)

  const applyTemplate = (tpl: ChallengeTemplate) => {
    setTemplateKey(tpl.key)
    setEmoji(tpl.emoji)
    setTitle(tpl.title)
    setRewardText(tpl.reward_text)
    setMetric(tpl.metric)
    setMode(tpl.mode)
    setTarget(String(tpl.target))
    setChoreFilter(tpl.chore_filter)
    setRoutineType(tpl.routine_type ?? '')
  }

  // Fresh form each time it opens: every kid in, this week, the chosen template.
  useEffect(() => {
    if (!open) return
    setChildIds(kids.map(k => k.id))
    setStartsOn(thisWeek.starts_on)
    setEndsOn(thisWeek.ends_on)
    setMoney('')
    if (initialTemplate) {
      applyTemplate(initialTemplate)
    } else {
      setTemplateKey(null)
      setEmoji('🏆')
      setTitle('')
      setRewardText('')
      setMetric('chores')
      setMode('team')
      setTarget('20')
      setChoreFilter('any')
      setRoutineType('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const targetNum = Number.parseInt(target, 10)
  const rewardCents = money ? amountToCents(money) ?? 0 : 0
  const preview =
    Number.isInteger(targetNum) && targetNum > 0
      ? describeTarget({ metric, mode, target: targetNum, chore_filter: choreFilter, routine_type: routineType || null })
      : null

  const problem = (() => {
    if (!title.trim()) return 'Give the challenge a name'
    if (!rewardText.trim()) return 'Say what the kids win'
    if (!Number.isInteger(targetNum) || targetNum < 1 || targetNum > 1000) return 'Set a target from 1 to 1000'
    if (childIds.length < 2) return 'Pick at least two kids'
    if (!startsOn || !endsOn || endsOn < startsOn) return 'The end date must be on or after the start'
    if (endsOn > addDays(startsOn, 92)) return 'A challenge can run up to 93 days'
    return null
  })()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem) {
      toast.error(problem)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          emoji,
          rewardText: rewardText.trim(),
          rewardCents,
          metric,
          mode,
          target: targetNum,
          choreFilter,
          routineType: metric === 'routines' && routineType ? routineType : null,
          childIds,
          startsOn,
          endsOn,
        }),
      })
      if (res.status === 403) {
        toast.error('Family challenges are part of Premium.', {
          action: {
            label: 'See Premium',
            onClick: () =>
              window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing', source: 'gate_challenges' } })),
          },
        })
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || data?.error || 'Could not save the challenge')
        return
      }
      toast.success(`${emoji} ${title.trim()} is on! Good luck, team.`)
      onCreated()
      onOpenChange(false)
    } catch {
      toast.error('Could not save the challenge')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="overflow-y-auto dialog-content-bg max-w-xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <Trophy className="w-7 h-7 text-amber-500 dark:text-amber-400" aria-hidden />
              New family challenge
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              The kids work together toward one reward. Everyone sees the team bar fill up.
            </DialogDescription>
          </DialogHeader>

          {/* One-tap templates */}
          <div className="space-y-2">
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Start from an idea</p>
            <div className="flex flex-wrap gap-2">
              {CHALLENGE_TEMPLATES.map(tpl => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  aria-pressed={templateKey === tpl.key}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition-colors ${
                    templateKey === tpl.key
                      ? 'accent-fill border-transparent'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span aria-hidden>{tpl.emoji}</span> {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Name and reward */}
          <div className={FIELD}>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500 dark:text-pink-400" aria-hidden />
              <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>Name and reward</h4>
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Challenge picture">
              {CHALLENGE_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={emoji === e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-xl grid place-items-center border ${
                    emoji === e
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/40'
                      : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="challenge-title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Challenge name</Label>
              <Input id="challenge-title" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} placeholder="Pizza Night" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="challenge-reward" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>What the team wins</Label>
              <Input id="challenge-reward" value={rewardText} maxLength={80} onChange={e => setRewardText(e.target.value)} placeholder="Pizza night, movie night, a trip to the park..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="challenge-money" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Plus money for each kid <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{currencySymbol(currencyCode)}</span>
                <Input
                  id="challenge-money"
                  inputMode="decimal"
                  value={money}
                  onChange={e => setMoney(sanitizeAmountInput(e.target.value))}
                  placeholder="0.00"
                  className="max-w-[8rem]"
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Added to each kid&apos;s balance when you mark the reward delivered.
              </p>
            </div>
          </div>

          {/* Target */}
          <div className={FIELD}>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400" aria-hidden />
              <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>The target</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="challenge-metric" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>What counts</Label>
                <select id="challenge-metric" className={SELECT} value={metric} onChange={e => setMetric(e.target.value as ChallengeMetric)}>
                  <option value="chores">Chore check-offs</option>
                  <option value="routines">Routine completions</option>
                </select>
              </div>
              {metric === 'chores' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="challenge-chore-filter" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Which chores</Label>
                  <select id="challenge-chore-filter" className={SELECT} value={choreFilter} onChange={e => setChoreFilter(e.target.value as ChallengeChoreFilter)}>
                    <option value="any">Any chore</option>
                    <option value="bonus">Bonus chores only</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="challenge-routine-type" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Which routines</Label>
                  <select id="challenge-routine-type" className={SELECT} value={routineType} onChange={e => setRoutineType(e.target.value as ChallengeRoutineType | '')}>
                    <option value="">Any routine</option>
                    <option value="morning">Morning</option>
                    <option value="bedtime">Bedtime</option>
                    <option value="afterschool">After school</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="challenge-mode" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>How it adds up</Label>
                <select id="challenge-mode" className={SELECT} value={mode} onChange={e => setMode(e.target.value as ChallengeMode)}>
                  <option value="team">Together, as a team</option>
                  <option value="each">Each kid reaches it</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="challenge-target" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Target</Label>
                <Input id="challenge-target" type="number" min={1} max={1000} inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} />
              </div>
            </div>
            {preview && (
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Goal: {preview}</p>
            )}
          </div>

          {/* Who and when */}
          <div className={FIELD}>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden />
              <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>The team</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {kids.map(kid => {
                const on = childIds.includes(kid.id)
                return (
                  <button
                    key={kid.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChildIds(on ? childIds.filter(id => id !== kid.id) : [...childIds, kid.id])}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
                      on ? 'accent-fill border-transparent' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {kid.name}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <CalendarDays className="w-5 h-5 text-sky-500 dark:text-sky-400" aria-hidden />
              <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>When</h4>
              {(startsOn !== thisWeek.starts_on || endsOn !== thisWeek.ends_on) && (
                <button
                  type="button"
                  className="ml-auto text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline"
                  onClick={() => { setStartsOn(thisWeek.starts_on); setEndsOn(thisWeek.ends_on) }}
                >
                  This week
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="challenge-start" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Starts</Label>
                <Input id="challenge-start" type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="challenge-end" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Ends</Label>
                <Input id="challenge-end" type="date" value={endsOn} min={startsOn} onChange={e => setEndsOn(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={saving || !!problem} title={problem ?? undefined} className="font-bold">
              <Trophy className="w-4 h-4" aria-hidden />
              {saving ? 'Starting...' : 'Start challenge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
