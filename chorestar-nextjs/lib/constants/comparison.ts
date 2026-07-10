/**
 * Comparison / "alternative to" pages.
 *
 * The hub lives at /compare; each spoke is a focused, high-intent landing page
 * at /compare/<slug>. Registered here so the sitemap (lib/seo/sitemap.ts) picks
 * them up automatically — mirrors the BLOG_POSTS pattern.
 *
 * IMPORTANT: keep competitor claims category-level and durable. Specific named
 * prices/features change and can go stale (or worse, be wrong) — verify against
 * the competitor's live site before publishing a hard number.
 */

export interface ComparisonPage {
  /** '' = hub (/compare); otherwise the spoke slug (/compare/<slug>) */
  slug: string
  path: string
  title: string
  description: string
  isoDate: string
}

export const COMPARISON_PAGES: ComparisonPage[] = [
  {
    slug: '',
    path: '/compare',
    title: 'ChoreStar vs the Alternatives',
    description:
      'How ChoreStar compares to smart-display chore charts, kids debit-card apps, and basic chore-list apps — no hardware, no bank account, no email for kids.',
    isoDate: '2026-07-02',
  },
  {
    slug: 'skylight-alternative',
    path: '/compare/skylight-alternative',
    title: 'The Best Skylight Chore Chart Alternative',
    description:
      'Want a Skylight-style chore chart without buying a $160+ wall device? ChoreStar runs on the phones and tablets you already own — free to start.',
    isoDate: '2026-07-02',
  },
  {
    slug: 'chore-app-without-debit-card',
    path: '/compare/chore-app-without-debit-card',
    title: 'A Kids Chore & Allowance App With No Debit Card',
    description:
      'Track chores and allowance without opening a bank account or giving your child a debit card. ChoreStar keeps you in control of real money.',
    isoDate: '2026-07-02',
  },
  {
    slug: 'greenlight-alternative',
    path: '/compare/greenlight-alternative',
    title: 'The Best Greenlight Alternative for Chores & Allowance',
    description:
      'Love the idea of Greenlight but not the debit card, bank link, and monthly fee? ChoreStar tracks chores and allowance with no card and no bank — free to start.',
    isoDate: '2026-07-02',
  },
  {
    slug: 'best-free-chore-app',
    path: '/compare/best-free-chore-app',
    title: 'The Best Free Chore App for Kids',
    description:
      'Looking for a genuinely free chore chart app for kids? Here is what to look for — and how ChoreStar’s free plan compares to paid apps and wall devices.',
    isoDate: '2026-07-02',
  },
]

export type ComparisonColumnKey = 'chorestar' | 'smartDisplay' | 'debitCard' | 'basicApp'

export interface ComparisonColumn {
  key: ComparisonColumnKey
  label: string
  /** short sub-label describing the category */
  note: string
  highlight?: boolean
}

export const COMPARISON_COLUMNS: ComparisonColumn[] = [
  { key: 'chorestar', label: 'ChoreStar', note: 'App, any device', highlight: true },
  { key: 'smartDisplay', label: 'Smart displays', note: 'e.g. Skylight' },
  { key: 'debitCard', label: 'Debit-card apps', note: 'e.g. Greenlight, GoHenry' },
  { key: 'basicApp', label: 'Basic chore apps', note: 'simple checklists' },
]

export interface ComparisonRow {
  feature: string
  values: Record<ComparisonColumnKey, string>
}

/**
 * Category-level claims only. "yes / no / ~" plus a short qualifier. These are
 * durable statements about a *category*, not a specific competitor's price.
 */
export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Cost to start',
    values: {
      chorestar: 'Free',
      smartDisplay: 'Buy a device',
      debitCard: 'Monthly fee',
      basicApp: 'Free / varies',
    },
  },
  {
    feature: 'Physical hardware required',
    values: { chorestar: 'No', smartDisplay: 'Yes', debitCard: 'No', basicApp: 'No' },
  },
  {
    feature: 'Bank account / debit card required',
    values: { chorestar: 'No', smartDisplay: 'No', debitCard: 'Yes', basicApp: 'No' },
  },
  {
    feature: 'Kids log in with no email',
    values: {
      chorestar: 'Yes — family code + PIN',
      smartDisplay: 'On the device',
      debitCard: 'Kid account',
      basicApp: 'Often shared login',
    },
  },
  {
    feature: 'Step-by-step routines with timers',
    values: { chorestar: 'Yes', smartDisplay: 'Limited', debitCard: 'No', basicApp: 'Rare' },
  },
  {
    feature: 'Gamification (badges, streaks, confetti)',
    values: { chorestar: 'Yes', smartDisplay: 'Light', debitCard: 'Light', basicApp: 'Light' },
  },
  {
    feature: 'Flexible allowance tracking',
    values: {
      chorestar: 'Yes — per-chore or flat, any currency',
      smartDisplay: 'Basic',
      debitCard: 'Real card spending',
      basicApp: 'Varies',
    },
  },
  {
    feature: 'Works on phone, tablet & computer',
    values: { chorestar: 'Yes', smartDisplay: 'Its own screen', debitCard: 'App', basicApp: 'App' },
  },
  {
    feature: 'One-time / lifetime option',
    values: { chorestar: 'Yes — $149.99', smartDisplay: '—', debitCard: 'No', basicApp: 'Sometimes' },
  },
]

/** Values that should render as a positive (green check-styled) cell. */
export function isPositive(value: string): boolean {
  return /^(yes|free)/i.test(value)
}
/** Values that should render as a negative (muted) cell. */
export function isNegative(value: string): boolean {
  return /^(no|—)/i.test(value)
}
