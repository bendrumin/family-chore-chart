'use client'

import { useAndroidShell } from '@/lib/utils/platform'

// Wraps purchase surfaces that live inside server components: renders
// children everywhere except inside the Android shell (see lib/utils/platform).
export function HideOnAndroidShell({ children }: { children: React.ReactNode }) {
  const shell = useAndroidShell()
  if (shell) return null
  return <>{children}</>
}
