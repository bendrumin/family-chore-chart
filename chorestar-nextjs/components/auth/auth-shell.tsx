import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChoreStarLogo } from '@/components/brand/logo'
import { GRADIENT_TEXT } from '@/lib/constants/brand'
import { AmbientBackground } from '@/components/ui/ambient-background'

interface AuthShellProps {
  title: string
  subtitle?: string
  /** Small uppercase pill above the title (e.g. "Free to start"). */
  tag?: string
  children: ReactNode
  /** Optional content rendered below the card (e.g. a trust note). */
  footer?: ReactNode
  /** Tailwind max-width class for the card column. */
  maxWidth?: string
}

/**
 * Shared entry-page frame: aurora backdrop + brand lockup + a soft card.
 * Matches the dashboard's surface/typography language. Purely presentational —
 * pages pass their existing form as children; no behavior changes.
 */
export function AuthShell({ title, subtitle, tag, children, footer, maxWidth = 'max-w-md' }: AuthShellProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--gradient-bg)' }}>
      <AmbientBackground />

      <div className={`relative z-10 w-full ${maxWidth}`}>
        <div
          className="rounded-3xl border p-8 sm:p-9"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'hsl(var(--border))',
            boxShadow: '0 1px 2px rgba(20,20,50,0.05), 0 22px 48px -20px rgba(70,60,140,0.4)',
          }}
        >
          <div className="mb-5 flex items-center justify-center">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight" style={GRADIENT_TEXT}>
              <ChoreStarLogo size={32} /> ChoreStar
            </Link>
          </div>

          {tag && (
            <span
              className="mx-auto mb-3 block w-fit rounded-full px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}
            >
              {tag}
            </span>
          )}

          <h1 className="text-center text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 mb-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-6" />}

          {children}
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
