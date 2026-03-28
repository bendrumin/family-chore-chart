import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Teaching Kids About Money With a Chore Reward System',
  description: 'How to set up allowance tracking that teaches financial responsibility — from flat daily rates to per-chore rewards and weekly bonuses.',
  keywords: [
    'chore reward system',
    'kids allowance tracker',
    'teach kids about money',
    'allowance for chores',
    'chore payment app',
    'kids earn money chores',
    'per chore reward',
  ],
  openGraph: {
    title: 'Teaching Kids About Money With a Chore Reward System',
    description: 'How to set up allowance tracking that teaches financial responsibility.',
    url: 'https://chorestar.app/blog/chore-reward-system-kids-money',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Teaching Kids About Money With a Chore Reward System',
    description: 'How to set up allowance tracking that teaches financial responsibility.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/chore-reward-system-kids-money',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Teaching Kids About Money With a Chore Reward System',
  description: 'How to set up allowance tracking that teaches financial responsibility.',
  url: 'https://chorestar.app/blog/chore-reward-system-kids-money',
  datePublished: '2026-03-28',
  dateModified: '2026-03-28',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

export default function ChoreRewardSystemPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Allowance</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">March 28, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">6 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Teaching Kids About Money With a Chore Reward System
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Should kids earn allowance for chores? And if so, how do you set it up so it actually teaches them
              something about money?
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Allowance Debate</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Parents disagree on whether allowance should be tied to chores at all. Some say it teaches a work-for-pay
              mindset. Others worry it means kids will refuse to help unless paid. The truth is somewhere in the
              middle — and the right system depends on what works for your family.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar supports two reward modes because families approach this differently. You can switch between
              them anytime in Settings → Family, so you&apos;re not locked into a decision.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Two Reward Modes</h2>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Flat Daily Rate</h3>
            <p className="text-gray-700 dark:text-gray-300">
              This is the default in ChoreStar. You set a single reward amount per day (the default is 7 cents).
              If your child completes any chores that day, they earn the set amount. This works well for younger
              kids who are just building the habit — the focus is on participation, not on maximizing output.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The flat rate also avoids the &ldquo;I&apos;ll only do the expensive chores&rdquo; problem. Every chore matters equally
              because the reward is tied to the day, not the individual task.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Per-Chore Rewards</h3>
            <p className="text-gray-700 dark:text-gray-300">
              For older kids who understand the concept of effort-based pay, Per-Chore mode lets you set a unique
              reward amount on each individual chore. Vacuuming the living room might be worth 25 cents while making
              your bed is worth 5 cents. Earnings accumulate as kids complete each task — bigger chores earn more,
              and each chore card shows its reward amount so kids always know what they&apos;re working toward.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              This mode teaches a more direct connection between effort and reward. A child who takes on harder chores
              earns more, which mirrors how the real world works.
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden my-6">
              <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                <div className="p-5">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Flat Daily Rate</p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>Best for ages 3-8</li>
                    <li>Focuses on participation</li>
                    <li>Same amount regardless of chore</li>
                    <li>Simpler to understand</li>
                  </ul>
                </div>
                <div className="p-5">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Per-Chore Rewards</p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>Best for ages 8+</li>
                    <li>Teaches effort = reward</li>
                    <li>Hard chores earn more</li>
                    <li>Mirrors real-world pay</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Full Week Bonus</h2>
            <p className="text-gray-700 dark:text-gray-300">
              On top of daily or per-chore earnings, ChoreStar has a Full Week Bonus. Instead of a dollar amount,
              you set a fun label — &ldquo;pizza night,&rdquo; &ldquo;movie night,&rdquo; &ldquo;stay up late,&rdquo; &ldquo;ice cream.&rdquo; When a child
              completes every chore every day for a full 7-day week, the bonus label pops up as a celebration.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              This is intentionally non-monetary. The weekly bonus is about experiences and privileges, which research
              suggests are more motivating for kids than small cash amounts. It also gives families a shared goal to
              look forward to.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Making Earnings Visible</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The most important thing about any reward system is that kids can see their progress. In ChoreStar,
              earnings are tracked on the parent dashboard with weekly stats and per-child comparisons. Each chore card
              in Per-Chore mode shows its reward amount, so there&apos;s never any ambiguity about what a task is worth.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar supports 12 currencies — USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, BRL, and KRW — so
              families around the world can track earnings in their local currency.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Age to Start?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Kids as young as 3-4 can start with the Flat Daily Rate. At that age, the &ldquo;earning&rdquo; is mostly
              symbolic — they&apos;re learning that doing tasks leads to good things. By 7-8, most kids are ready to
              understand that different tasks are worth different amounts, which is when Per-Chore mode becomes
              valuable.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The reward amounts in ChoreStar&apos;s chore suggestion engine range from 3 cents for simple self-care tasks
              to 50 cents for harder household responsibilities. These aren&apos;t large amounts, but that&apos;s the
              point — kids learn that money adds up gradually through consistent effort, not from a single big windfall.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Setting It Up</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Go to Settings → Family in ChoreStar. You&apos;ll see your current reward mode (Flat Daily Rate is the
              default). To switch to Per-Chore mode, toggle the setting, then go to each chore and set its reward
              amount. You can also set the Full Week Bonus label here — pick something your family will actually
              be excited about.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The beauty is that you can change modes anytime. Start with flat daily rewards while your kids are
              young, then switch to per-chore when they&apos;re ready for a more nuanced system.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Start tracking allowance today</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                ChoreStar&apos;s free plan supports up to 3 kids and 20 chores with full reward tracking. Set up
                your family&apos;s reward system in under two minutes — no credit card required.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
              >
                Get Started Free →
              </Link>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
