/**
 * Whole-routine "finish by" timer (Premium, migration 032).
 *
 * Gentle on purpose, for kids who get flooded by a ticking clock: there is no
 * fail state. Running past the target only changes the words to steady
 * encouragement; finishing under it is celebrated.
 */

export const MIN_TARGET_SECONDS = 60
export const MAX_TARGET_SECONDS = 7200

export interface RoutineTimeStatus {
  /** Seconds left before the target, never negative. */
  remainingSeconds: number
  /** 0 → 1 share of the target still left; drives the shrinking bar. */
  fractionLeft: number
  /** Past the target. The player keeps going and just says "keep going". */
  overTime: boolean
  /** 'plenty' > half left, 'some' > a quarter, 'little' otherwise. Calm colors only. */
  phase: 'plenty' | 'some' | 'little' | 'over'
}

export function routineTimeStatus(elapsedSeconds: number, targetSeconds: number): RoutineTimeStatus {
  const target = Math.max(1, Math.round(targetSeconds))
  const elapsed = Math.max(0, Math.floor(elapsedSeconds))
  const remaining = Math.max(0, target - elapsed)
  const fractionLeft = remaining / target
  const overTime = elapsed >= target
  const phase: RoutineTimeStatus['phase'] = overTime
    ? 'over'
    : fractionLeft > 0.5
    ? 'plenty'
    : fractionLeft > 0.25
    ? 'some'
    : 'little'
  return { remainingSeconds: remaining, fractionLeft, overTime, phase }
}

/**
 * Seconds a finished routine beat its target by, or null when there was no
 * target or it ran over. Under 30 s early isn't worth a fanfare.
 */
export function finishedEarlyBy(durationSeconds: number, targetSeconds: number | null | undefined): number | null {
  if (!targetSeconds || targetSeconds <= 0) return null
  const early = Math.round(targetSeconds - durationSeconds)
  return early >= 30 ? early : null
}

/** "12:05" style clock for the bar. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Builder input (whole minutes, may be blank) → stored seconds or null.
 * Clamped to 1 minute .. 2 hours, matching the column check.
 */
export function targetMinutesToSeconds(minutes: string | number | null | undefined): number | null {
  if (minutes === null || minutes === undefined || minutes === '') return null
  const n = typeof minutes === 'number' ? minutes : Number(minutes)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(MAX_TARGET_SECONDS, Math.max(MIN_TARGET_SECONDS, Math.round(n) * 60))
}

/** Sum of the per-step timers, a sensible suggestion for the finish-by field. */
export function suggestedTargetSeconds(steps: Array<{ duration_seconds?: number | null }>): number | null {
  const total = steps.reduce((sum, s) => sum + (s.duration_seconds && s.duration_seconds > 0 ? s.duration_seconds : 0), 0)
  if (total <= 0) return null
  // Round up to whole minutes with a little slack (10%), inside the column range.
  const withSlack = Math.ceil((total * 1.1) / 60) * 60
  return Math.min(MAX_TARGET_SECONDS, Math.max(MIN_TARGET_SECONDS, withSlack))
}
