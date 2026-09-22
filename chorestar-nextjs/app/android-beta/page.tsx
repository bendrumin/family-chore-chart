import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { AndroidBetaSignup } from '@/components/home/android-beta-signup'

/**
 * Sign-up page for the Google Play test. Play will not hand a test build to
 * anyone whose Google account is not on the track's tester list first, so this
 * page's job is to collect that address and set expectations about the wait.
 */
export const metadata: Metadata = {
  // Titled for the query people actually type ("chore app for android"), not
  // just the brand, since nobody searches for a beta by name.
  title: 'ChoreStar for Android: Join the Beta',
  description:
    'Early access to the native ChoreStar chore chart app for Android: chores with rewards, routines with timers, kid login with a PIN, and allowance tracking. Free while it is in testing.',
  openGraph: {
    title: 'Join the ChoreStar Android Beta | ChoreStar',
    description: 'Early access to the native ChoreStar Android app, free while it is in testing.',
    url: 'https://chorestar.app/android-beta',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://chorestar.app/android-beta' },
}

const FEATURES = [
  ['🏠', 'The whole app, natively', 'Chores, routines with timers, the week board, stats and the reward store, built for Android rather than wrapped from the web.'],
  ['🔐', 'Kid login with a PIN', 'Your kids sign in with a family code and a four digit PIN. No email address, no password to forget.'],
  ['🔔', 'Alerts that arrive', 'A nudge when a chore needs approving, and a daily reminder you can set to any time.'],
  ['🎨', 'Your colours', 'Every theme and accent from the web app, matched to Android light and dark mode.'],
]

/**
 * Search engines get the same answer the page gives: a free Android app for
 * families, currently in testing. operatingSystem is what makes this show up
 * for "android" rather than the generic web-app entry on the homepage.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ChoreStar for Android',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Android 8.0 or later',
  description:
    'Native Android app for family chore charts: chores with rewards, step-by-step routines with timers, kid login with a PIN, and allowance tracking. Currently in closed testing.',
  url: 'https://chorestar.app/android-beta',
  softwareVersion: 'Beta',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

export default function AndroidBetaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🤖</div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">
            Join the ChoreStar Android beta
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            The native Android app is built and running. We&apos;re testing it with a small group of
            families before it goes out to everyone on Google Play, and there&apos;s room for you.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-900 p-6 sm:p-8 mb-12">
          <AndroidBetaSignup />
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 text-center">
            What you get
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map(([icon, title, body]) => (
              <div key={title} className="bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 text-center">
            How it works
          </h2>
          <ol className="space-y-4">
            {[
              ['Send us your Google account email', 'The address signed in on your Android phone. Play checks it before it will give you the build.'],
              ['We add you to the test', "You'll get a link back from hi@chorestar.app. Tap Become a tester, then Download on Google Play."],
              ['Install and sign in', 'Use your existing ChoreStar account, or make one in the app. Everything syncs with the web app and with iPhone.'],
              ['Tell us what breaks', 'Reply to that email with anything that looks wrong. That is the entire point of a beta.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="text-sm text-gray-600 dark:text-gray-300 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Good to know</h2>
          <p>
            The beta is free, and it is the same app the App Store version is built from, so your
            family data is the real thing rather than a sandbox. Premium works too: if you already
            subscribe on the web or on iPhone, your account keeps it.
          </p>
          <p>
            Android 8.0 or newer. You can leave the test whenever you like from Google Play, and we
            delete your address from the list on request.{' '}
            <Link href="/privacy" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Privacy policy
            </Link>
            .
          </p>
          <p>
            On an iPhone instead?{' '}
            <Link href="/#ios-app" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              ChoreStar is live on the App Store
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
