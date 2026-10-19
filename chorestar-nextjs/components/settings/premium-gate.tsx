'use client'

import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAndroidShell } from '@/lib/utils/platform'
import { playBillingAvailable } from '@/lib/utils/play-billing-client'
import type { GatedFeature } from '@/lib/utils/subscription'
import type { MoneyFeature } from '@/lib/utils/money'

/**
 * Gated features plus Premium-only features added after the 2026-09-19
 * cutoff, which are not grandfathered (so they are not GatedFeature, whose
 * canUseFeature passes pre-cutoff accounts): the calendar feed, family
 * challenges, the routine upgrades (migration 032) and the money tools
 * (migration 030). The Billing source is `gate_<key>` either way.
 */
export type RoutineGateFeature = 'routine_photos' | 'routine_timer' | 'ai_routine' | 'routine_live'
export type PremiumGateKey = GatedFeature | 'calendar' | 'challenges' | RoutineGateFeature | MoneyFeature
export type PremiumGateFeature = PremiumGateKey

/** Open Billing from a crowned button, logging why (paywall_events source). */
export function openPremiumBilling(feature: PremiumGateFeature): void {
  window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing', source: `gate_${feature}` } }))
}

/** Same as openPremiumBilling (the money tools' name for it). */
export const openPremiumGate = openPremiumBilling

const COPY: Record<PremiumGateKey, { title: string; body: string }> = {
  jars: {
    title: 'Spend, Save and Give jars come with Premium',
    body: 'Pick a split like 70/20/10. Every cent your kid earns from then on lands in three jars, and the store spends from Spend.',
  },
  allowance: {
    title: 'Automatic weekly allowance comes with Premium',
    body: 'A fixed amount on the day you choose, optionally only when most of the week\'s chores got done.',
  },
  interest: {
    title: 'Interest on savings comes with Premium',
    body: 'Pay a small weekly percentage on what sits in the Save jar, so waiting visibly pays.',
  },
  fines: {
    title: 'Fines and paybacks come with Premium',
    body: 'Take money off with a reason, or set a weekly repayment like a phone bill. Never below zero unless you say so.',
  },
  minutes: {
    title: 'Screen-time minutes come with Premium',
    body: 'Chores and routines can earn minutes as well as money. Kids bank them; you mark them used.',
  },
  themes: {
    title: 'Premium themes',
    body: 'Ocean, Sunset, Forest, Aurora, Coral, and Lavender come with Premium. The seasonal themes stay free.',
  },
  sharing: {
    title: 'Family sharing is part of Premium',
    body: 'Invite a co-parent or guardian with their own login to the same family.',
  },
  export: {
    title: 'Export reports come with Premium',
    body: 'PDF family reports and CSV data for spreadsheets. The printable chore charts below stay free.',
  },
  analytics: {
    title: 'Advanced analytics come with Premium',
    body: 'Completion trends, per-child comparisons, and streak history. The weekly stats on your dashboard stay free.',
  },
  calendar: {
    title: 'The family calendar feed comes with Premium',
    body: 'Kids\' chores and routines in Apple Calendar, Google Calendar, Outlook or a wall calendar, updated automatically.',
  },
  challenges: {
    title: 'Family challenges come with Premium',
    body: 'Siblings team up for a shared reward: 50 chores this week for pizza night, bedtime routines for movie night. Everyone sees the team bar fill up.',
  },
  routine_photos: {
    title: 'Picture steps come with Premium',
    body: 'Add a photo to any step (their own toothbrush, their shoes by the door) so pre-readers can follow along. Icons and read-aloud stay free.',
  },
  routine_timer: {
    title: 'Finish-by timers come with Premium',
    body: 'Set a gentle total time for the whole routine. Kids see a calm countdown and get cheered for finishing early. No fail state, ever.',
  },
  ai_routine: {
    title: 'Build routines with AI on Premium',
    body: 'Describe what you need ("school mornings, 7, forgets to brush teeth") and get age-appropriate steps with icons and timers to edit.',
  },
  routine_live: {
    title: 'See routines live with Premium',
    body: 'Watch which step your kid is on from your own phone ("Maya is on step 3 of 6: Brush teeth") without hovering.',
  },
}

/**
 * The upgrade panel shown where a gated feature would be. Inside the Android
 * shell it states the limit with no purchase CTA (Play policy), the same
 * split the child and chore caps use.
 */
export function PremiumGate({
  feature,
  compact = false,
  ctaLabel = 'Open Billing',
}: {
  feature: PremiumGateKey
  compact?: boolean
  ctaLabel?: string
}) {
  const androidShell = useAndroidShell()
  const copy = COPY[feature]

  // Shell without Play Billing (plugin absent): state the limit, no CTA.
  // With Play Billing present the button opens the Billing tab, which
  // sells through Play, so this is policy-clean either way.
  if (androidShell && !playBillingAvailable()) {
    return (
      <div className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {copy.title}. This is a Premium feature.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-indigo-200 dark:border-indigo-800 ${compact ? 'p-4' : 'p-5'}`} style={{ background: 'var(--card-bg)' }}>
      <div className="flex items-start gap-3 mb-4">
        <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className={`${compact ? 'text-base' : 'text-lg'} font-bold mb-1`} style={{ color: 'var(--text-primary)' }}>
            {copy.title}
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{copy.body}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="gradient"
        size={compact ? 'sm' : 'lg'}
        className={`${compact ? '' : 'w-full'} font-bold hover-glow`}
        onClick={() => openPremiumBilling(feature)}
      >
        <Crown className="w-4 h-4 mr-2" />
        {ctaLabel}
      </Button>
    </div>
  )
}
