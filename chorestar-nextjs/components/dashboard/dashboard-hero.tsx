'use client'

import { ChoreIcon } from '@/components/ui/chore-icon'
import { ThemeParticles } from '@/components/dashboard/theme-particles'

interface DashboardHeroProps {
  familyName: string
  done: number
  total: number
  earnedCents: number
  isSharedMember?: boolean
}

/**
 * Time-of-day greeting. The icons run sunrise → sun → sunset → moon so each
 * slot is distinguishable at a glance; the old evening icon was 🌆 (cityscape
 * at dusk), which renders as a dark skyline and read as night.
 */
function greeting(): { text: string; icon: string } {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: '🌅' }
  if (h < 17) return { text: 'Good afternoon', icon: '☀️' }
  if (h < 21) return { text: 'Good evening', icon: '🌇' }
  return { text: 'Good night', icon: '🌙' }
}

/**
 * Progress-first hero — greeting + count + ring. No pill clusters or holiday
 * sticker piles; seasonal feel comes from ThemeParticles + page aurora.
 */
export function DashboardHero({ familyName, done, total, earnedCents, isSharedMember }: DashboardHeroProps) {
  const { text: greetingText, icon: greetingIcon } = greeting()
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const R = 52
  const C = 2 * Math.PI * R
  const offset = C * (1 - (total > 0 ? done / total : 0))
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="relative overflow-hidden rounded-[1.25rem] px-6 py-6 flex items-center gap-5 flex-col sm:flex-row sm:items-center"
      style={{
        // iOS ThemeManager.gradient + white type. Fills are nudged just enough
        // for white ink to clear WCAG AA (summer teal darkens slightly rather
        // than switching to black text).
        background:
          'linear-gradient(135deg, var(--hero-fill, var(--primary-fill)) 0%, var(--hero-secondary-fill, var(--hero-fill, var(--primary-fill))) 100%)',
        color: 'var(--hero-foreground, var(--primary-foreground))',
        boxShadow: '0 12px 28px -16px color-mix(in srgb, var(--hero-fill, var(--primary-fill)) 55%, transparent)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120px 120px at 82% 18%, color-mix(in srgb, currentColor 12%, transparent), transparent 70%)',
        }}
      />

      <ThemeParticles />

      <div className="relative flex-1 min-w-0 w-full">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] opacity-80">
          {dateLabel}
          <span className="opacity-60"> · </span>
          {familyName}
          {isSharedMember && (
            <span
              className="ml-2 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold normal-case tracking-normal"
              style={{ background: 'color-mix(in srgb, currentColor 16%, transparent)' }}
            >
              Shared
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium opacity-90">
          <ChoreIcon emoji={greetingIcon} className="w-4 h-4" />
          <span>{greetingText}</span>
        </div>

        <div className="mt-1.5 text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
          {total === 0 ? (
            <span className="text-xl font-semibold opacity-85">No chores yet today</span>
          ) : (
            <>
              {done}
              <span className="text-xl font-semibold opacity-70"> of {total} done</span>
            </>
          )}
        </div>

        {total > 0 && (
          <p className="mt-2 text-sm font-medium opacity-75 tabular-nums">
            ${(earnedCents / 100).toFixed(2)} earned · {pct}% complete
          </p>
        )}
      </div>

      <div className="relative h-[112px] w-[112px] flex-none">
        <svg width="112" height="112" viewBox="0 0 118 118" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="59"
            cy="59"
            r={R}
            fill="none"
            stroke="color-mix(in srgb, currentColor 22%, transparent)"
            strokeWidth="10"
          />
          <circle
            cx="59"
            cy="59"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[1.55rem] font-bold tracking-tight tabular-nums">
          {pct}%
        </div>
      </div>
    </div>
  )
}
