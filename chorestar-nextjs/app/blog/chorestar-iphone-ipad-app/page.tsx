import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { BlogPostExtras } from '@/components/blog/blog-post-extras'
import { AppStoreBadge, APP_STORE_URL } from '@/components/home/app-store-badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ChoreStar for iPhone & iPad: The Chore App Your Kid Can Run Themselves',
  description:
    'ChoreStar is now on the App Store, a family chore app with PIN-based kid login, step-by-step routines with timers, home screen widgets, and instant sync with the web app.',
  keywords: [
    'chore app for iPhone',
    'chore app for iPad',
    'family chore app iOS',
    'kids chore chart app',
    'chore app kids no email',
    'morning routine app for kids',
    'allowance tracker app iPhone',
    'chore app with web version',
  ],
  openGraph: {
    type: 'article',
    publishedTime: '2026-08-17',
    images: ['/og-image.png'],
    title: 'ChoreStar for iPhone & iPad: The Chore App Your Kid Can Run Themselves',
    description:
      'PIN-based kid login, step-by-step routines with timers, widgets, and instant sync with the web app, now on the App Store.',
    url: 'https://chorestar.app/blog/chorestar-iphone-ipad-app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChoreStar for iPhone & iPad: The Chore App Your Kid Can Run Themselves',
    description:
      'PIN-based kid login, step-by-step routines with timers, widgets, and instant sync with the web app, now on the App Store.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/chorestar-iphone-ipad-app',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'ChoreStar for iPhone & iPad: The Chore App Your Kid Can Run Themselves',
  image: 'https://chorestar.app/og-image.png',
  description:
    'ChoreStar is now on the App Store. PIN-based kid login, step-by-step routines with timers, home screen widgets, and instant sync with the web app.',
  url: 'https://chorestar.app/blog/chorestar-iphone-ipad-app',
  datePublished: '2026-08-17',
  dateModified: '2026-08-17',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

export default function ChoreStarIosAppPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Announcements</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">August 17, 2026</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">6 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              ChoreStar for iPhone &amp; iPad Is Here: The Chore App Your Kid Can Run Themselves
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              After months of building (and eight rounds with App Review), the native ChoreStar
              app is live on the App Store. Here&apos;s what it does, and why it&apos;s not just
              another chore checklist.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <div className="not-prose my-8 text-center">
              <AppStoreBadge />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Free to download. Works with your existing ChoreStar account, or start fresh.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Kid Is the User, Not a Profile</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Search &ldquo;chore app&rdquo; on the App Store and you&apos;ll find dozens of apps
              where the <em>parent</em> is the operator: the parent&apos;s phone, the parent&apos;s
              account, the parent checking things off while the kid watches. ChoreStar flips that.
              Kids log in themselves with a <strong>family code and a 4-digit PIN</strong>, no
              email address, no password, no account of their own. That means a seven-year-old can
              open the app on the family iPad, tap their own avatar, and run their own day.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Routines That Actually Get Followed</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Morning and bedtime are where family friction lives, so routines are the heart of the
              app, not a repeating to-do list. Build a morning routine once (get dressed, brush
              teeth, pack backpack, each step with its own icon and optional timer), and your kid
              steps through it one big &ldquo;Done!&rdquo; button at a time. Step timers show up in
              the <strong>Dynamic Island and on the Lock Screen</strong>, there&apos;s a progress
              bar, and finishing earns points and a confetti celebration. It turns &ldquo;did you
              brush your teeth?!&rdquo; into something kids race to finish on their own.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Allowance Without a Debit Card</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Plenty of apps want to give your nine-year-old a Visa card and a bank login. ChoreStar
              deliberately doesn&apos;t. Chores carry reward amounts (per-chore or a daily rate,
              your choice), earnings add up transparently through the week, and <em>you</em> pay out
              however your family does money: cash, a transfer, screen time, a trip for ice cream.
              The trust-building of allowance, no fintech onboarding required.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Web App and iOS App Are One Account, Synced Instantly</h2>
            <p className="text-gray-700 dark:text-gray-300">
              This is the part almost no chore app on the App Store offers: ChoreStar is a
              <strong> full web app and a native iOS app on the same family account</strong>. Set up
              chores from your laptop during lunch; the kids see them on the iPad immediately. A kid
              checks off &ldquo;feed the dog&rdquo; on the iPhone; your dashboard updates on the web.
              No export, no sync button, no &ldquo;premium sync&rdquo; upsell. It&apos;s just one
              account everywhere, including any browser on a school Chromebook.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Built for iOS, Not Ported to It</h2>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Home screen widgets</strong>, today&apos;s progress at a glance, no app launch needed</li>
              <li><strong>Routine timers in the Dynamic Island</strong> and on the Lock Screen</li>
              <li><strong>Kid mode</strong> with big buttons, playful animations, and sound effects</li>
              <li><strong>Seasonal themes</strong> that change with the calendar, plus dark mode</li>
              <li><strong>Achievement badges</strong> for streaks, perfect days, and perfect weeks</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Private by Design</h2>
            <p className="text-gray-700 dark:text-gray-300">
              No ads. No third-party analytics or trackers. Kids never enter personal information.
              The PIN login exists precisely so children don&apos;t need accounts. Family data is
              never shared or sold. That&apos;s rare in this category, and it&apos;s verifiable in
              the app&apos;s privacy label.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Free to Start, Honest About Pricing</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The free plan isn&apos;t a trial: up to 3 kids and 20 chores, with routines and badges
              included, free forever. Premium (from $4.99/month, with annual and lifetime options)
              adds unlimited children and chores, premium themes, and co-parent sharing. No
              paywall-by-day-two surprise.
            </p>

            <div className="not-prose my-10 rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-white dark:bg-gray-800 p-8 text-center shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Try It This Week</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Set up your family in about two minutes. Add a child, pick a starter routine, and
                hand over the iPad tomorrow morning.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <AppStoreBadge />
                <Link
                  href="/signup"
                  className="inline-block px-6 py-3 rounded-xl font-bold border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  Or start on the web →
                </Link>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already a ChoreStar family on the web? Just{' '}
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">
                download the app
              </a>{' '}
              and sign in with your existing account. Everything will be there.
            </p>
          </div>

          <BlogPostExtras slug="chorestar-iphone-ipad-app" />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
