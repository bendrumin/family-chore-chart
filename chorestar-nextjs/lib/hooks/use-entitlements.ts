'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/lib/contexts/settings-context'
import { canUseFeature, type GatedFeature } from '@/lib/utils/subscription'

/**
 * Whether the family (the owner's plan, so co-parents inherit it) may use a
 * gated feature. Resolves from the owner's profile: premium passes, and so
 * does any account created before the 2026-09-19 cutoff (docs/PREMIUM.md).
 * `loading` stays true until the profile answers; callers should render
 * nothing gated-looking until then, never a lock that flickers away.
 */
export function useEntitlements() {
  const { settings } = useSettings()
  const familyId = settings?.user_id ?? null
  const [state, setState] = useState<{ loading: boolean; tier: string; createdAt: string | null }>({
    loading: true,
    tier: 'free',
    createdAt: null,
  })

  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('subscription_type, created_at')
      .eq('id', familyId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setState({
          loading: false,
          tier: data?.subscription_type ?? 'free',
          createdAt: data?.created_at ?? null,
        })
      })
    return () => {
      cancelled = true
    }
  }, [familyId])

  return {
    loading: state.loading,
    tier: state.tier,
    can: (feature: GatedFeature) => canUseFeature(feature, state.tier, state.createdAt),
  }
}
