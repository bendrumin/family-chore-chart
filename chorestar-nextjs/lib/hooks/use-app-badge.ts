'use client'

import { useEffect } from 'react'
import { syncAppBadge } from '@/lib/utils/app-badge'

/**
 * Keeps the installed app's icon badge at `count`. null (still loading)
 * leaves the badge as it was. The badge deliberately survives unmount: it is
 * meant to be read while the app is closed.
 */
export function useAppBadge(count: number | null) {
  useEffect(() => {
    if (count === null) return
    void syncAppBadge(count)
  }, [count])
}
