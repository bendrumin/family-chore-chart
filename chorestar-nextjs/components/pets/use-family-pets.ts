'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PetState } from '@/lib/pets/state'

export interface FamilyPetKid {
  childId: string
  childName: string
  pet: PetState | null
}

export interface FamilyPets {
  premium: boolean
  kids: FamilyPetKid[]
}

/**
 * GET /api/pets (migration 034): every kid's pet, derived on the server the
 * same way the kid sees it. `unavailable` when the route fails (for example
 * before the migration), so callers can render nothing.
 */
export function useFamilyPets(refreshKey: unknown = 0) {
  const [data, setData] = useState<FamilyPets | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pets', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      setData(await res.json())
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  return { data, unavailable, reload: load, setData }
}
