import { Repeat, Zap } from 'lucide-react'
import { sharedChoreBadge, sharedGroupOf, type SharedChoreFields } from '@/lib/utils/shared-chores'

/** "Takes turns" / "Bonus" pill on a shared chore (migration 025). Renders nothing for ordinary chores. */
export function SharedChoreBadge({ chore, className = '' }: { chore: SharedChoreFields; className?: string }) {
  const badge = sharedChoreBadge(chore)
  if (!badge) return null
  const rotate = sharedGroupOf(chore)?.mode === 'rotate'
  const Icon = rotate ? Repeat : Zap
  return (
    <span
      title={badge.title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
        rotate
          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      } ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {badge.label}
    </span>
  )
}
