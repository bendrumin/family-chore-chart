'use client'

import { Home, Users, ClipboardList, BarChart3, Settings } from 'lucide-react'
import { useAndroidShell } from '@/lib/utils/platform'

/** The five the iOS app has, in the same order. */
export type ShellTab = 'home' | 'family' | 'chores' | 'stats' | 'settings'

const TABS: Array<{ id: ShellTab; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'chores', label: 'Chores', icon: ClipboardList },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

/**
 * App-style bottom tab bar for the Android shell (Capacitor WebView).
 * Renders nothing outside the shell, so web and iOS Safari never see it;
 * it is only mounted from the parent dashboard, so kid mode never gets it.
 * The parent adds matching bottom padding to the page content while this
 * bar is visible.
 */
export function ShellTabBar({ active, onSelect }: {
  active: ShellTab
  onSelect: (tab: ShellTab) => void
}) {
  const shell = useAndroidShell()
  if (!shell) return null

  return (
    <nav
      aria-label="App navigation"
      className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 z-[10005] border-t border-black/[0.06] dark:border-white/[0.08] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-stretch">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-1.5 px-0.5 transition-colors active:bg-black/[0.05] dark:active:bg-white/[0.08]"
              style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              <span className={`text-[10px] leading-tight truncate max-w-full ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
