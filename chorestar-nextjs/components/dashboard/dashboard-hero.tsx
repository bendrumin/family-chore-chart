'use client'

import { Star, Flame } from 'lucide-react'
import { ChoreIcon } from '@/components/ui/chore-icon'

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
  if (h < 12) return { text: 'Good morning!', icon: '🌅' }
  if (h < 17) return { text: 'Good afternoon!', icon: '☀️' }
  if (h < 21) return { text: 'Good evening!', icon: '🌇' }
  return { text: 'Good night!', icon: '🌙' }
}

export function DashboardHero({ familyName, done, total, earnedCents, isSharedMember }: DashboardHeroProps) {
  const { text: greetingText, icon: greetingIcon } = greeting()
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const R = 52
  const C = 2 * Math.PI * R
  const offset = C * (1 - (total > 0 ? done / total : 0))
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-7 py-7 flex items-center gap-6 flex-col sm:flex-row sm:items-center"
      style={{
        background: 'var(--gradient-primary)',
        // Not text-white: most theme accents are pale enough that white text
        // fails AA on them, so the ink is chosen from the gradient itself.
        color: 'var(--gradient-foreground)',
        boxShadow: '0 20px 44px -18px rgba(15, 23, 42, 0.32)',
      }}
    >
      {/* soft highlights */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120px 120px at 82% 18%, color-mix(in srgb, var(--gradient-foreground) 14%, transparent), transparent 70%), radial-gradient(90px 90px at 92% 82%, color-mix(in srgb, var(--gradient-foreground) 9%, transparent), transparent 70%)',
        }}
      />

      <div className="relative flex-1 min-w-0 w-full">
        <div className="text-xs font-bold uppercase tracking-[0.1em] opacity-90">
          {dateLabel} · {familyName}
          {isSharedMember && (
            <span className="ml-2 rounded-full px-2 py-0.5 text-[0.65rem] font-bold normal-case tracking-normal"
              style={{ background: 'color-mix(in srgb, var(--gradient-foreground) 20%, transparent)' }}>
              Shared
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-base font-semibold opacity-90">
          <ChoreIcon emoji={greetingIcon} className="w-5 h-5" />
          <span>{greetingText}</span>
        </div>

        <div className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
          {total === 0 ? (
            <span className="text-2xl font-bold opacity-[0.85]">No chores yet today</span>
          ) : (
            <>
              {done}{' '}
              <span className="text-2xl font-semibold opacity-75">of {total} chores done today</span>
            </>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur-sm"
              style={{ background: 'color-mix(in srgb, var(--gradient-foreground) 16%, transparent)' }}>
              <Star className="h-4 w-4 text-yellow-300" fill="currentColor" />
              ${(earnedCents / 100).toFixed(2)} earned today
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold backdrop-blur-sm"
              style={{ background: 'color-mix(in srgb, var(--gradient-foreground) 16%, transparent)' }}>
              <Flame className="h-4 w-4 text-orange-300" fill="currentColor" />
              {pct}% complete
            </span>
          </div>
        )}
      </div>

      {/* Progress ring */}
      <div className="relative h-[118px] w-[118px] flex-none">
        <svg width="118" height="118" viewBox="0 0 118 118" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="59" cy="59" r={R} fill="none" stroke="color-mix(in srgb, currentColor 25%, transparent)" strokeWidth="11" />
          <circle
            cx="59" cy="59" r={R} fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[1.7rem] font-extrabold tracking-tight tabular-nums">
          {pct}%
        </div>
      </div>
    </div>
  )
}
