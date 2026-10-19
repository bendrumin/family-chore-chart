/**
 * Live parent view (Premium, migration 032): pure helpers shared by the
 * player (writes) and the dashboard (reads).
 *
 * The player reports the step a kid is on through the kid API; the dashboard
 * shows "Maya is on step 3 of 6 — Brush teeth". A row nobody has touched in
 * STALE_AFTER_MS is an abandoned run (tablet left on the counter) and is
 * ignored rather than shown forever.
 */

/** One row of GET /api/routines/live. Step fields are absent when `locked` (free plan). */
export interface LiveRoutine {
  routineId: string
  routineName: string
  routineColor: string | null
  childId: string
  childName: string
  childColor: string | null
  startedAt: string
  updatedAt: string
  locked: boolean
  stepIndex?: number
  stepsTotal?: number
  stepTitle?: string | null
}

export const STALE_AFTER_MS = 30 * 60 * 1000
/** Minimum gap between progress writes from one player. */
export const PROGRESS_THROTTLE_MS = 4000

export function isProgressFresh(updatedAt: string | number | Date, now: number = Date.now()): boolean {
  const t = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime()
  if (!Number.isFinite(t)) return false
  return now - t < STALE_AFTER_MS
}

export function liveProgressLine(p: {
  childName: string
  stepIndex: number
  stepsTotal: number
  stepTitle?: string | null
}): string {
  const step = Math.min(p.stepsTotal, Math.max(1, p.stepIndex + 1))
  const base = `${p.childName} is on step ${step} of ${p.stepsTotal}`
  const title = p.stepTitle?.trim()
  return title ? `${base} — ${title}` : base
}

/**
 * Throttled, latest-wins reporter. Calls `send` at most once per `intervalMs`;
 * a report that arrives inside the window is held and sent when it closes,
 * replacing anything older (only the newest step matters). `flush` sends the
 * pending one now; `cancel` drops it.
 */
export function createThrottledReporter<T>(
  send: (value: T) => void,
  intervalMs: number = PROGRESS_THROTTLE_MS,
  clock: { now: () => number; setTimeout: (fn: () => void, ms: number) => unknown; clearTimeout: (h: unknown) => void } = {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: h => clearTimeout(h as ReturnType<typeof setTimeout>),
  }
) {
  let last = -Infinity
  let pending: { value: T } | null = null
  let timer: unknown = null

  const fire = () => {
    timer = null
    if (!pending) return
    const { value } = pending
    pending = null
    last = clock.now()
    send(value)
  }

  return {
    report(value: T) {
      pending = { value }
      const wait = last + intervalMs - clock.now()
      if (wait <= 0) {
        if (timer !== null) {
          clock.clearTimeout(timer)
          timer = null
        }
        fire()
      } else if (timer === null) {
        timer = clock.setTimeout(fire, wait)
      }
    },
    flush() {
      if (timer !== null) {
        clock.clearTimeout(timer)
        timer = null
      }
      fire()
    },
    cancel() {
      if (timer !== null) clock.clearTimeout(timer)
      timer = null
      pending = null
    },
  }
}
