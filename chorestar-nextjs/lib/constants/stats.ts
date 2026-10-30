/**
 * Every audience number the site states lives here, and every one comes from
 * the production database, never an estimate. Rounded down so they stay true
 * as we grow. Re-count before raising them.
 *
 * Counted 2026-10-30: 366 logins, 4 of them co-parents (about 361 families,
 * including a few demo and test accounts), 527 kids, 92 parents signed in over
 * the last 30 days.
 */
export const STATS = {
  families: '350+',
  kids: '500+',
  monthlyParents: 'about 90',
} as const

export const FAMILIES_LABEL = `${STATS.families} families`
