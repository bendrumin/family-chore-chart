/**
 * Which feature to point a family at next, and when a quiet family is due a
 * nudge. Pure, so lib/engagement/discovery.test.ts covers it without a database.
 *
 * Why this exists: in October 2026 three Apple subscribers turned off
 * auto-renew, and the two who were really leaving had stopped opening the app
 * 25 and 35 days earlier. Five premium features shipped that month had ten
 * combined uses. People were not leaving for lack of features; they had
 * forgotten the app, and never met what they were paying for. So the same list
 * drives two things: a push for families who have gone quiet, and a card for
 * families who are active but have not found something yet.
 *
 * Order is deliberate. A kid's own PIN and a routine come first because in
 * this product's own data they predict whether a family is still active a
 * month later (about 3.6x and 2.6x). Premium features follow, only for
 * families who have them: the newer ones are Premium-only and not
 * grandfathered (docs/PREMIUM.md), so pointing a free family at money jars
 * would send them to a paywall.
 */

export type FeatureId = 'kid_login' | 'routines' | 'star_pets' | 'money_jars' | 'challenges' | 'calendar_feed'

/** Where a feature can be pointed at. Star Pets are not in the iOS app yet, so
 *  a push about them would land most families on a screen without them. */
export type Surface = 'push' | 'web'

export interface FamilyUsage {
  hasPin: boolean
  hasRoutine: boolean
  hasPet: boolean
  hasMoney: boolean
  hasChallenge: boolean
  hasCalendar: boolean
  /** Challenges are siblings working together; one kid has no one to team up with. */
  kidCount: number
}

export interface Feature {
  id: FeatureId
  premiumOnly: boolean
  surfaces: Surface[]
  tried: (u: FamilyUsage) => boolean
  /** False when the feature makes no sense for this family yet. */
  applies?: (u: FamilyUsage) => boolean
  /** Push notification copy. `kid` is the family's first child's name. */
  push: (kid: string) => { title: string; body: string }
  /** In-app card copy and the button label. */
  card: (kid: string) => { title: string; body: string; cta: string }
}

export const FEATURES: Feature[] = [
  {
    id: 'kid_login',
    premiumOnly: false,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasPin,
    push: (kid) => ({
      title: `Let ${kid} tick off their own chores`,
      body: `Set a 4-digit PIN and ${kid} can sign in on any device. No email needed.`,
    }),
    card: (kid) => ({
      title: `Give ${kid} their own login`,
      body: `With a 4-digit PIN, ${kid} signs in on any device and checks off chores without you.`,
      cta: 'Set a PIN',
    }),
  },
  {
    id: 'routines',
    premiumOnly: false,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasRoutine,
    push: (kid) => ({
      title: 'Mornings, sorted',
      body: `Build a morning routine ${kid} can step through alone, one big Done button at a time.`,
    }),
    card: (kid) => ({
      title: 'Try a morning routine',
      body: `Get dressed, brush teeth, pack the bag: ${kid} steps through it one task at a time.`,
      cta: 'Build a routine',
    }),
  },
  {
    id: 'star_pets',
    premiumOnly: false,
    surfaces: ['web'],
    tried: (u) => u.hasPet,
    push: (kid) => ({ title: `${kid} can adopt a Star Pet`, body: 'It grows as chores get done.' }),
    card: (kid) => ({
      title: `${kid} can adopt a Star Pet`,
      body: 'A pet that grows every time a chore gets done. Every family gets a pup.',
      cta: 'Turn on Star Pets',
    }),
  },
  {
    id: 'money_jars',
    premiumOnly: true,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasMoney,
    push: (kid) => ({
      title: `${kid}'s allowance can run itself`,
      body: 'Spend, Save and Give jars and a weekly allowance are part of your Premium.',
    }),
    card: (kid) => ({
      title: 'Spend, Save and Give jars',
      body: `Split ${kid}'s earnings into jars, pay a weekly allowance automatically, and add interest on savings.`,
      cta: 'Set up jars',
    }),
  },
  {
    id: 'challenges',
    premiumOnly: true,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasChallenge,
    applies: (u) => u.kidCount > 1,
    push: () => ({
      title: 'Team up the kids',
      body: 'Family challenges let siblings work toward one shared reward. It is part of your Premium.',
    }),
    card: () => ({
      title: 'Start a family challenge',
      body: 'Siblings work together toward one shared reward, like pizza night after 30 chores.',
      cta: 'Start a challenge',
    }),
  },
  {
    id: 'calendar_feed',
    premiumOnly: true,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasCalendar,
    push: () => ({
      title: 'Chores on your calendar',
      body: 'Add the family chore chart to Apple, Google or Outlook calendar. It is part of your Premium.',
    }),
    card: () => ({
      title: 'Put chores on your calendar',
      body: 'Subscribe once in Apple, Google or Outlook calendar and the week stays in sync.',
      cta: 'Get the calendar link',
    }),
  },
]

/** The next feature this family has not tried, on this surface, that their plan includes. */
export function nextFeature(
  usage: FamilyUsage,
  premium: boolean,
  surface: Surface,
  skip: ReadonlySet<FeatureId> = new Set()
): Feature | null {
  for (const f of FEATURES) {
    if (!f.surfaces.includes(surface)) continue
    if (f.premiumOnly && !premium) continue
    if (skip.has(f.id)) continue
    if (f.tried(usage)) continue
    if (f.applies && !f.applies(usage)) continue
    return f
  }
  return null
}

/** Every feature this family has not tried, on this surface, that their plan includes. */
export function untriedFeatures(usage: FamilyUsage, premium: boolean, surface: Surface): Feature[] {
  return FEATURES.filter((f) => f.surfaces.includes(surface) && (!f.premiumOnly || premium) && !f.tried(usage) && (!f.applies || f.applies(usage)))
}

/** Copy for a quiet family who has already tried everything worth pointing at. */
export function fallbackPush(kid: string): { title: string; body: string } {
  return { title: 'Ready for this week?', body: `${kid}'s chore chart is waiting. Pick up where you left off.` }
}

export const LAPSE_MIN_DAYS = 7
/** Past this the family has most likely moved on, and a push out of nowhere
 *  reads as spam rather than a reminder. Also bounds the first run, which
 *  would otherwise reach every family that has ever gone quiet. */
export const LAPSE_MAX_DAYS = 30

const DAY_MS = 86_400_000

/**
 * Whether a quiet family is due one nudge.
 *
 * One per lapse: once nudged, nothing more until they come back and go quiet
 * again (lastNudged earlier than lastActivity). Never during vacation mode,
 * which promises the family "alerts quiet".
 */
export function lapseDue(args: {
  lastActivity: Date | null
  lastNudged: Date | null
  now: Date
  onVacation: boolean
}): { due: boolean; daysQuiet: number | null } {
  const { lastActivity, lastNudged, now, onVacation } = args
  if (!lastActivity) return { due: false, daysQuiet: null }
  const daysQuiet = Math.floor((now.getTime() - lastActivity.getTime()) / DAY_MS)
  if (onVacation) return { due: false, daysQuiet }
  if (daysQuiet < LAPSE_MIN_DAYS || daysQuiet > LAPSE_MAX_DAYS) return { due: false, daysQuiet }
  if (lastNudged && lastNudged.getTime() >= lastActivity.getTime()) return { due: false, daysQuiet }
  return { due: true, daysQuiet }
}

/** True when `day` (YYYY-MM-DD) falls inside an inclusive date range. */
export function withinRange(day: string, start: string | null | undefined, end: string | null | undefined): boolean {
  if (!start) return false
  if (day < start) return false
  return !end || day <= end
}
