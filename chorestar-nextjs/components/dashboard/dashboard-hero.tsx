'use client'

import { Star, Flame } from 'lucide-react'

interface DashboardHeroProps {
  familyName: string
  done: number
  total: number
  earnedCents: number
  isSharedMember?: boolean
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning! ☀️'
  if (h < 17) return 'Good afternoon! 👋'
  if (h < 21) return 'Good evening! 🌆'
  return 'Good night! 🌙'
}

export function DashboardHero({ familyName, done, total, earnedCents, isSharedMember }: DashboardHeroProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const R = 52
  const C = 2 * Math.PI * R
  const offset = C * (1 - (total > 0 ? done / total : 0))
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-7 py-7 text-white flex items-center gap-6 flex-col sm:flex-row sm:items-center"
      style={{
        background: 'var(--gradient-primary)',
        boxShadow: '0 20px 44px -18px rgba(99, 80, 220, 0.6)',
      }}
    >
      {/* soft highlights */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120px 120px at 82% 18%, rgba(255,255,255,0.16), transparent 70%), radial-gradient(90px 90px at 92% 82%, rgba(255,255,255,0.10), transparent 70%)',
        }}
      />

      <div className="relative flex-1 min-w-0 w-full">
        <div className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
          {dateLabel} · {familyName}
          {isSharedMember && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-bold normal-case tracking-normal">
              Shared
            </span>
          )}
        </div>
        <div className="mt-0.5 text-base font-semibold text-white/90">{greeting()}</div>

        <div className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
          {total === 0 ? (
            <span className="text-2xl font-bold text-white/85">No chores yet today</span>
          ) : (
            <>
              {done}{' '}
              <span className="text-2xl font-semibold text-white/75">of {total} chores done today</span>
            </>
          )}
        </div>

        {total > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Star className="h-4 w-4 text-yellow-300" fill="currentColor" />
              ${(earnedCents / 100).toFixed(2)} earned today
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <Flame className="h-4 w-4 text-orange-300" fill="currentColor" />
              {pct}% complete
            </span>
          </div>
        )}
      </div>

      {/* Progress ring */}
      <div className="relative h-[118px] w-[118px] flex-none">
        <svg width="118" height="118" viewBox="0 0 118 118" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="59" cy="59" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="11" />
          <circle
            cx="59" cy="59" r={R} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round"
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
