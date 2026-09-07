'use client'

import { ChoreIcon } from '@/components/ui/chore-icon'
import { ThemeParticles } from '@/components/dashboard/theme-particles'
import { ChildAvatarContent } from '@/components/children/child-avatar-content'
import { formatMoney } from '@/lib/constants/currencies'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface DashboardHeroProps {
  familyName: string
  done: number
  total: number
  earnedCents: number
  isSharedMember?: boolean
  children?: Child[]
  perChild?: Record<string, { done: number; total: number }>
  onSelectChild?: (id: string) => void
  currencyCode?: string | null
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

/** Activity ring in the hero's own ink (white on the seasonal fill). */
function HeroRing({ done, total, child }: { done: number; total: number; child: Child }) {
  const R = 31
  const C = 2 * Math.PI * R
  const p = total > 0 ? done / total : 0
  const color = child.avatar_color || '#6366f1'
  return (
    <div className="relative h-[64px] w-[64px] sm:h-[72px] sm:w-[72px]">
      <svg width="100%" height="100%" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="35" cy="35" r={R} fill="none" strokeWidth="4"
          stroke="color-mix(in srgb, currentColor 28%, transparent)"
        />
        <circle
          cx="35" cy="35" r={R} fill="none" strokeWidth="4"
          stroke="currentColor" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - p)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div
        className="absolute inset-[7px] grid place-items-center overflow-hidden rounded-full text-lg font-bold"
        style={{ background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)` }}
      >
        <ChildAvatarContent child={child} name={child.name} />
      </div>
    </div>
  )
}

/**
 * Family-first hero: the family name leads, each kid carries their own
 * progress as an activity ring around their avatar, and the family total
 * sits to the right. Seasonal feel comes from the themed fill,
 * ThemeParticles, and the page aurora, all unchanged.
 */
export function DashboardHero({
  familyName,
  done,
  total,
  earnedCents,
  isSharedMember,
  children = [],
  perChild = {},
  onSelectChild,
  currencyCode,
}: DashboardHeroProps) {
  const { text: greetingText, icon: greetingIcon } = greeting()
  const hasKids = children.length > 0

  return (
    <div
      className="relative overflow-hidden rounded-[1.25rem] px-4 py-4 sm:px-6 sm:py-5"
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

      <div className="relative">
        {/* Greeting left, date right */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium opacity-90">
            <ChoreIcon emoji={greetingIcon} className="w-4 h-4" />
            <span>{greetingText}</span>
          </div>
          <div className="text-xs font-semibold opacity-75">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* The family leads */}
        <h2 className="mt-1 text-2xl sm:text-[1.75rem] font-extrabold tracking-tight">
          {familyName}
          {isSharedMember && (
            <span
              className="ml-2 align-middle rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold"
              style={{ background: 'color-mix(in srgb, currentColor 16%, transparent)' }}
            >
              Shared
            </span>
          )}
        </h2>

        {hasKids ? (
          <div className="mt-3 flex items-center gap-4 sm:gap-6">
            {/* Each kid carries their own progress */}
            <div className="flex flex-1 gap-4 overflow-x-auto pb-1 sm:gap-6">
              {children.map((child) => {
                const prog = perChild[child.id] || { done: 0, total: 0 }
                const ring = (
                  <>
                    <HeroRing done={prog.done} total={prog.total} child={child} />
                    <div className="text-xs font-bold">
                      {child.name}{' '}
                      <span className="font-semibold opacity-75 tabular-nums">
                        {prog.total > 0 ? `${prog.done}/${prog.total}` : 'none today'}
                      </span>
                    </div>
                  </>
                )
                return onSelectChild ? (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectChild(child.id)}
                    aria-label={`Show ${child.name}'s chores`}
                    className="flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    {ring}
                  </button>
                ) : (
                  <div key={child.id} className="flex shrink-0 flex-col items-center gap-1.5">
                    {ring}
                  </div>
                )
              })}
            </div>

            {/* Family total */}
            <div className="flex flex-none flex-col items-end gap-0.5 text-right">
              <div className="font-display text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">
                {done} of {total}
              </div>
              <div className="text-xs font-semibold opacity-85 tabular-nums">
                {total > 0
                  ? `${formatMoney(earnedCents, currencyCode)} earned today`
                  : 'No chores due today'}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold opacity-85">
            Add a child to start tracking chores.
          </p>
        )}
      </div>
    </div>
  )
}
