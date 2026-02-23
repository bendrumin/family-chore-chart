'use client'

import { useEffect } from 'react'

function shouldBeDark(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true
  }
  const hour = new Date().getHours()
  return hour >= 19 || hour < 7
}

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function applyDarkMode() {
      document.documentElement.classList.toggle('dark', shouldBeDark())
    }

    applyDarkMode()

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', applyDarkMode)

    const interval = setInterval(applyDarkMode, 60_000)
    return () => {
      mql.removeEventListener('change', applyDarkMode)
      clearInterval(interval)
    }
  }, [])

  return <>{children}</>
}
