'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The kid's wallet, from /api/kid/wallet: balance, goal, store, limits.
 * One fetch shared by the goal card and the store section; `refresh()` after
 * anything that moves money or changes the goal.
 */

export interface KidGoal {
  id: string
  title: string
  emoji: string | null
  targetCents: number
  progressCents: number
  percent: number
  reached: boolean
  status: string
  reachedAt: string | null
  createdBy: string
}

export interface KidStoreItem {
  id: string
  title: string
  emoji: string | null
  priceCents: number
  affordable: boolean
  shortByCents: number
  pendingRequestId: string | null
}

export interface KidWallet {
  childId: string
  actor: 'kid' | 'parent'
  owedCents: number
  earnedCents: number
  paidCents: number
  currencyCode: string
  goal: KidGoal | null
  reachedGoals: KidGoal[]
  store: KidStoreItem[]
  pendingRedemptions: Array<{ id: string; itemId: string; priceCents: number; requestedAt: string }>
  limits: { premium: boolean; goalLimit: number | null; storeItemLimit: number | null }
}

export function useKidWallet(kidToken: string | null, refreshKey = 0) {
  const [wallet, setWallet] = useState<KidWallet | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!kidToken) return
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/kid/wallet', {
          headers: { Authorization: `Bearer ${kidToken}` },
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as KidWallet
        if (!active) return
        setWallet(data)
        setFailed(false)
      } catch {
        if (active) setFailed(true)
      }
    })()
    return () => { active = false }
  }, [kidToken, refreshKey, tick])

  return { wallet, failed, refresh }
}
