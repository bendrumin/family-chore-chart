'use client'

import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAndroidShell } from '@/lib/utils/platform'
import type { GatedFeature } from '@/lib/utils/subscription'

const COPY: Record<GatedFeature, { title: string; body: string }> = {
  themes: {
    title: 'Premium themes',
    body: 'Ocean, Sunset, Forest, Aurora, Coral, and Lavender come with Premium. The seasonal themes stay free.',
  },
  sharing: {
    title: 'Family sharing is part of Premium',
    body: 'Invite a co-parent or guardian with their own login to the same family. $4.99 a month or $49.99 a year.',
  },
  export: {
    title: 'Export reports come with Premium',
    body: 'PDF family reports and CSV data for spreadsheets. The printable chore charts below stay free.',
  },
  analytics: {
    title: 'Advanced analytics come with Premium',
    body: 'Completion trends, per-child comparisons, and streak history. The weekly stats on your dashboard stay free.',
  },
}

/**
 * The upgrade panel shown where a gated feature would be. Inside the Android
 * shell it states the limit with no purchase CTA (Play policy), the same
 * split the child and chore caps use.
 */
export function PremiumGate({ feature, compact = false }: { feature: GatedFeature; compact?: boolean }) {
  const androidShell = useAndroidShell()
  const copy = COPY[feature]

  if (androidShell) {
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
        onClick={() => window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing' } }))}
      >
        <Crown className="w-4 h-4 mr-2" />
        Open Billing
      </Button>
    </div>
  )
}
