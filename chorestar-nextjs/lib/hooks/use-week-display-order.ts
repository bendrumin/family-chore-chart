'use client'

import { useEffect, useState } from 'react'
import { ALL_DAYS, weekDisplayOrder } from '@/lib/utils/schedule'

/**
 * The locale-aware week display order for a 7-day grid, hydration-safe.
 *
 * The server and the first client render both use the Sunday-first fallback so
 * the markup matches; the detected order is applied in an effect after
 * hydration — the same pattern useKidT uses for the kid locale. The values are
 * storage day indexes (0=Sunday .. 6=Saturday); only their order is localized.
 */
export function useWeekDisplayOrder(): number[] {
  const [order, setOrder] = useState<number[]>(() => [...ALL_DAYS])

  useEffect(() => {
    const detected = weekDisplayOrder()
    // Keep the same array reference when nothing changed (most locales),
    // so consumers don't re-render for an identical order.
    setOrder(prev => (prev.every((d, i) => d === detected[i]) ? prev : detected))
  }, [])

  return order
}
