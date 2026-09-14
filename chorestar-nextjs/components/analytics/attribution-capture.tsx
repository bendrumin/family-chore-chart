'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/utils/attribution'

/** Mounts once in the root layout; records the first-touch attribution
 *  (UTMs, external referrer, landing path) for later signup. Renders nothing. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
