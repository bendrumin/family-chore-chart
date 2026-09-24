import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { BlogPostExtras } from '@/components/blog/blog-post-extras'
import { AppStoreBadge } from '@/components/home/app-store-badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ready for iOS 27 and the New iPhones',
  description:
    'iOS 27 shipped with the iPhone 18 Pro, Pro Max and iPhone Duo. ChoreStar already runs on all of it, and the holiday update goes further.',
  keywords: [
    'chore app iOS 27',
    'iOS 27 family apps',
    'chore app iPhone 18',
    'iPhone Duo apps',
    'kids chore chart app',
    'family chore app iOS',
  ],
  openGraph: {
    type: 'article',
    publishedTime: '2026-09-14',
    images: ['/og-image.png'],
    title: 'Ready for iOS 27 and the New iPhones',
    description:
      'iOS 27 shipped today. ChoreStar already runs on it, tested on the new screen sizes, with an iOS 27 update planned for the holidays.',
    url: 'https://chorestar.app/blog/chorestar-ios-27',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ready for iOS 27 and the New iPhones',
    description:
      'iOS 27 shipped today. ChoreStar already runs on it, tested on the new screen sizes, with an iOS 27 update planned for the holidays.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/chorestar-ios-27',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Ready for iOS 27 and the New iPhones',
  image: 'https://chorestar.app/og-image.png',
  description:
    'iOS 27 shipped today with the iPhone 18 Pro, Pro Max, and iPhone Duo. ChoreStar already runs on all of it.',
  url: 'https://chorestar.app/blog/chorestar-ios-27',
  datePublished: '2026-09-14',
  dateModified: '2026-09-14',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

export default function ChoreStarIos27Page() {
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
              <span className="text-xs text-gray-500 dark:text-gray-400">September 14, 2026</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">3 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Ready for iOS 27 and the New iPhones
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              iOS 27 shipped today, alongside the iPhone 18 Pro, the 18 Pro Max, and the
              folding iPhone Duo. If your family updated this weekend, here is where
              ChoreStar stands: everything works, and more is coming.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tested Before You Updated</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We test ChoreStar on new iOS versions before they reach your phone, on
              Apple&apos;s own simulators. The current release, <strong>2.2.1</strong> (out
              today, with a week view that can travel back to last week), is built with the
              iOS 27 SDK and verified on iOS 27 and the new screen sizes, including the
              iPhone Air. Chores, routines, kid login, widgets, and vacation mode all work
              as they did on Friday.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Setting up a new iPhone this week? Install ChoreStar, sign in, and your
              family is already there: kids, chores, streaks, and balances all live in your
              account, so nothing depends on the old phone.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">About That Folding One</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The iPhone Duo is brand new, and we will be straight with you: Apple has not
              yet shipped a Duo simulator for developers, so we have not run ChoreStar on
              one. What we do know is that ChoreStar already adapts between iPhone and iPad
              layouts, and that is the same mechanism the Duo uses when it unfolds. The
              moment Apple ships the simulator, we test on it, and anything that needs
              polish gets polish.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What iOS 27 Makes Possible</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The interesting part of iOS 27 for a family app is under the hood. Our
              holiday update is being built on it:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>Chore suggestions that run on your iPhone.</strong> iOS 27 lets
                apps use Apple&apos;s on-device models, so suggestions can work offline and
                nothing about your family leaves the device.
              </li>
              <li>
                <strong>Siri and tap-to-check widgets.</strong> Mark a chore done from the
                home screen, or ask Siri how much your kid has saved.
              </li>
              <li>
                <strong>Apple&apos;s new parental-consent system.</strong> iOS 27 adds
                system-level age and consent APIs. A family app should be first in line
                for these, and we are building on them.
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              We only announce features when they ship, so treat this as direction, and
              watch the What&apos;s New screen this fall.
            </p>

            <div className="not-prose my-8 text-center">
              <AppStoreBadge />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Free to download. Works with your existing ChoreStar account, or start fresh.
              </p>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              And if the chart slipped while everyone was busy setting up new phones: the
              week view now travels. Flip back to last week and check off what actually
              got done. That one is live today.
            </p>
          </div>

          <BlogPostExtras slug="chorestar-ios-27" />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
