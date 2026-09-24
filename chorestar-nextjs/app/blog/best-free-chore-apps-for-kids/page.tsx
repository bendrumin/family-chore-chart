import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { BlogPostExtras } from '@/components/blog/blog-post-extras'
import { AppStoreBadge } from '@/components/home/app-store-badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best Free Chore Apps for Kids in 2026',
  description:
    'Twelve chore apps, every pricing page checked. Three are genuinely free, two rank for "free" with no free plan at all. We make ChoreStar and say so.',
  keywords: [
    'best free chore apps for kids',
    'free chore app',
    'chore app comparison',
    'chore chart app free',
    'family chore app 2026',
    'allowance app for kids',
    'kids chore app no email',
  ],
  openGraph: {
    type: 'article',
    publishedTime: '2026-09-15',
    images: ['/og-image.png'],
    title: 'Best Free Chore Apps for Kids in 2026',
    description:
      'Twelve chore apps, every pricing page checked. Three are genuinely free, two have no free plan at all, and one looks parked.',
    url: 'https://chorestar.app/blog/best-free-chore-apps-for-kids',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Free Chore Apps for Kids in 2026',
    description:
      'Twelve chore apps, every pricing page checked. Three are genuinely free, two have no free plan at all, and one looks parked.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/best-free-chore-apps-for-kids',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Best Free Chore Apps for Kids in 2026',
  image: 'https://chorestar.app/og-image.png',
  description:
    'Twelve chore apps compared, every pricing page and App Store listing checked on September 15, 2026, including which "free" apps have no free plan.',
  url: 'https://chorestar.app/blog/best-free-chore-apps-for-kids',
  datePublished: '2026-09-15',
  dateModified: '2026-09-15',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Best free chore apps for kids in 2026',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Tasklio', url: 'https://tasklio.app' },
    { '@type': 'ListItem', position: 2, name: 'MyChoreBoard', url: 'https://mychoreboard.com' },
    { '@type': 'ListItem', position: 3, name: 'Kikaroo', url: 'https://kikaroo.app' },
    { '@type': 'ListItem', position: 4, name: 'ChoreStar', url: 'https://chorestar.app' },
    { '@type': 'ListItem', position: 5, name: 'Chorsee', url: 'https://chorsee.com' },
    { '@type': 'ListItem', position: 6, name: "S'moresUp", url: 'https://www.smoresup.com' },
    { '@type': 'ListItem', position: 7, name: 'Kid Chore', url: 'https://kidchore.com' },
    { '@type': 'ListItem', position: 8, name: 'ChoresFlow', url: 'https://choresflow.com' },
  ],
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      {children}
    </a>
  )
}

export default function BestFreeChoreAppsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([articleJsonLd, itemListJsonLd]) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Comparisons</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">September 15, 2026</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">10 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Best Free Chore Apps for Kids in 2026
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Search for a free chore app and most lists you find were written by one of
              the apps. Two apps that rank for &quot;free chore app&quot; have no free plan
              at all. We checked every pricing page ourselves, and here is what they
              actually say.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <div className="not-prose rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-5">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="text-gray-900 dark:text-white">Before anything else:</strong>{' '}
                we make ChoreStar. It is on this list, its limits are named the same way
                as everyone else&apos;s, and where another app beats it we say so. Every
                price and free-tier detail below comes from each app&apos;s own website or
                App Store listing, checked on September 15, 2026. Where a company does not
                state something, we write &quot;unclear&quot; and leave it at that. Prices
                change, so if a number matters to you, click through and confirm it.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Counts as Free Here</h2>
            <p className="text-gray-700 dark:text-gray-300">
              A free plan means your family can use the app next year without paying. A
              14-day trial does not qualify, no matter how the app describes itself. Three
              apps on this page passed that bar with no caveats, several passed with
              limits, and two failed it entirely. We put those two at the bottom so you
              stop wondering about them.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Completely Free Ones</h2>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Tasklio <span className="font-normal text-gray-500 dark:text-gray-400 text-base">(web only)</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://tasklio.app">Tasklio</ExternalLink> runs in the
              browser and everything is free: unlimited kids, unlimited chores, an
              allowance wallet with savings goals. Their words: &quot;100% free, forever.
              No credit card, no trial period, no expiry date.&quot; Kids sign in with a
              family code and a 4-digit PIN, and points wait until a parent approves the
              work with their own PIN, which settles the &quot;I already did it&quot;
              argument at the source.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The catch: there is no app. You open tasklio.app in a browser and add it to
              the home screen. That works fine on most devices, and it also means there
              are no App Store reviews to read, because it has never been in a store.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              MyChoreBoard <span className="font-normal text-gray-500 dark:text-gray-400 text-base">(web, iOS, Android, Fire)</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://mychoreboard.com">MyChoreBoard</ExternalLink> is
              free on every platform it ships on, including Amazon Fire tablets, and the
              App Store listing shows zero in-app purchases. The site commits to never
              charging for what you use today. The standout is WallBoard mode, which puts
              every kid&apos;s day on one central family screen. It holds 4.9 stars from
              54 ratings and has only been in the app stores since April 2026.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Two things to know. Kids operate inside the parent&apos;s account with
              profile switching or a device locked to one child; we could not find a
              per-kid PIN described anywhere on their site. And reviewers note a kid can
              request their allowance without finishing every chore. One more thing:
              MyChoreBoard&apos;s own blog publishes &quot;best chore app&quot; lists, so
              read those the way you are reading this one.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Kikaroo <span className="font-normal text-gray-500 dark:text-gray-400 text-base">(iOS, Android)</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://kikaroo.app">Kikaroo&apos;s</ExternalLink> free
              tier covers unlimited kids, unlimited chores, and the full points and
              rewards system, with no ads and no card required. Premium is $2.99 a month
              or $29.99 a year, the cheapest paid plan on this page, and adds step-by-step
              checklists and shared devices. It also suggests age-appropriate chores, and
              parents approve rewards before a kid can redeem them.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              It is young: 4.6 stars from 12 ratings. Each child gets their own login,
              though the site never explains how a child actually signs in (unclear), and
              one reviewer found no way to uncheck a chore ticked by accident.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Free Plans With Limits</h2>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              ChoreStar <span className="font-normal text-gray-500 dark:text-gray-400 text-base">(web, iPhone, iPad, Android in beta; ours)</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              This is our app, so here is the same treatment. The free plan covers 3 kids
              and 20 chores, with kid login, routines, and achievement badges, free
              forever with no card. That kid cap is real: a family with four kids pays.
              Premium is $4.99 a month or $49.99 a year and adds unlimited kids and
              chores, family sharing with a co-parent, premium themes, and export reports.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              What we built it around: the kid is the user. A seven-year-old signs in on a
              shared tablet with a family code and a 4-digit PIN (no email, they
              don&apos;t have one), runs a morning or bedtime routine step by step with
              timers, and watches their allowance grow toward a goal. The reward store
              prices things money cannot buy, like screen time or picking Friday dinner,
              and vacation mode pauses everything with streaks kept safe. Kid mode speaks
              English, Spanish, Portuguese, and Arabic.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Where we lose: the native Android app is still in{' '}
              <Link href="/android-beta" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                testing
              </Link>{' '}
              rather than on Google Play, no photo proof of completed chores, and we are
              newer with a small fraction of Chorsee&apos;s review count. The{' '}
              <Link href="/compare" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                compare pages
              </Link>{' '}
              go feature by feature if you want the long version.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Chorsee <span className="font-normal text-gray-500 dark:text-gray-400 text-base">(iOS, iPad, Mac, Vision, Android)</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://chorsee.com">Chorsee</ExternalLink> is the
              veteran: 4.6 stars from roughly 12,000 ratings, updated this month. It skips
              gamification on purpose. No points animations, no confetti. You get a clean
              weekly chart for the whole household, rotating and up-for-grabs chores, and
              photo proof. Kid access works per device: a child&apos;s device sees only
              their chore list, and a household PIN guards the parent controls, so there
              are no individual kid accounts.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Pricing is the puzzle. The App Store says &quot;Free&quot; with in-app
              purchases at $8.99 a month, $39.99 a year, or $119.99 lifetime, and neither
              the listing nor chorsee.com states what the free tier includes (unclear).
              You find the limits by hitting them.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              S&apos;moresUp <span className="font-normal text-gray-500 dark:text-gray-400 text-base">(iOS, Android)</span>
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              On paper, <ExternalLink href="https://www.smoresup.com">S&apos;moresUp</ExternalLink>{' '}
              has the deepest feature list here: chores that rotate between siblings, a
              compete mode, photo proof, a family message board, even smart-appliance
              hookups. After a 45-day premium trial, the core features stay free with
              unlimited family members. Premium is $9.99 a month or $99.99 a year on the
              website, while the App Store still lists $7.99 and $79.99, so what a new
              subscriber pays is unclear.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Here is what gave us pause, all of it checkable: the iOS app was last
              updated in October 2025, almost a year before this article. The support help
              center now shows a &quot;closed&quot; page. Recent reviews describe slow
              loads and unanswered support emails (4.2 stars, 896 ratings). The website is
              still maintained, so the company is alive. The app looks parked. Try it with
              that in mind.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Two More Worth a Look</h3>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://kidchore.com">Kid Chore</ExternalLink> (iOS,
              Android) gives each kid a 6-character code that a parent can revoke any
              time, with photo proof and a star-priced reward catalog. Premium is $3.99 a
              month or $69.99 lifetime; the free tier&apos;s exact limits are unclear. It
              has 5 ratings total and shipped password recovery this month, so it is
              very early. <ExternalLink href="https://choresflow.com">ChoresFlow</ExternalLink>{' '}
              (web only) is built for Muslim families: the five daily prayer times sit in
              the schedule next to chores, with athan notifications and a Hijri calendar.
              Free covers one child; the family plan is $4.99 a month.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ranked for &quot;Free&quot;, Without a Free Plan</h2>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://kidkarma.app">KidKarma</ExternalLink> (iOS,
              Android) offers a 14-day trial and asks for a payment method up front. Plans
              run $4.99 to $7.99 a month. Its QR-code kid login is genuinely clever (the
              kid scans the parent&apos;s phone, no email, no password), and the Family
              plan syncs across two households, which matters for co-parenting. Fine app,
              wrong search result.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://mynestboard.com">NestBoard</ExternalLink> (web,
              iOS, Android) gives you 14 days, then the household goes read-only until you
              pay $4.99 a month for unlimited members. It covers far more than chores:
              shared calendar, medications, meal planning, and kids get free seats with no
              account. Same verdict. Worth a look, and the word free does not apply.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">If You Want Real Money Involved</h2>
            <p className="text-gray-700 dark:text-gray-300">
              <ExternalLink href="https://busykid.com">BusyKid</ExternalLink> and{' '}
              <ExternalLink href="https://greenlight.com">Greenlight</ExternalLink> move
              actual dollars. BusyKid direct-deposits allowance every Friday onto prepaid
              Visa cards ($4 a month billed annually, up to five cards, and their site
              warns some card fees may apply). Greenlight is family banking with a debit
              card for up to five kids, chores included in every plan, from $5.99 a month.
              Neither has a free plan; both are financial products with a chore feature,
              so compare them against each other. The apps above never touch your money.
              You hand over allowance however you like.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Table</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 sm:hidden">
              The table scrolls sideways on a phone.
            </p>
            <div className="not-prose overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="p-3 font-semibold text-gray-900 dark:text-white">App</th>
                    <th className="p-3 font-semibold text-gray-900 dark:text-white">Platforms</th>
                    <th className="p-3 font-semibold text-gray-900 dark:text-white">Free plan</th>
                    <th className="p-3 font-semibold text-gray-900 dark:text-white">Paid</th>
                    <th className="p-3 font-semibold text-gray-900 dark:text-white">Kid login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">Tasklio</td>
                    <td className="p-3">Web (browser)</td>
                    <td className="p-3">Everything, unlimited kids</td>
                    <td className="p-3">None</td>
                    <td className="p-3">Family code + PIN</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">MyChoreBoard</td>
                    <td className="p-3">Web, iOS, Android, Fire</td>
                    <td className="p-3">Everything, unlimited kids</td>
                    <td className="p-3">None</td>
                    <td className="p-3">Parent account, profile switch</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">Kikaroo</td>
                    <td className="p-3">iOS, Android</td>
                    <td className="p-3">Unlimited kids, full rewards</td>
                    <td className="p-3 whitespace-nowrap">$2.99/mo · $29.99/yr</td>
                    <td className="p-3">Per-child (method unclear)</td>
                  </tr>
                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/30">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">ChoreStar (ours)</td>
                    <td className="p-3">Web, iPhone, iPad</td>
                    <td className="p-3">3 kids, 20 chores</td>
                    <td className="p-3 whitespace-nowrap">$4.99/mo · $49.99/yr</td>
                    <td className="p-3">Family code + 4-digit PIN</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">Chorsee</td>
                    <td className="p-3">iOS, iPad, Mac, Android</td>
                    <td className="p-3">Limits unstated</td>
                    <td className="p-3 whitespace-nowrap">$8.99/mo · $39.99/yr · $119.99 life</td>
                    <td className="p-3">Device mode + house PIN</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">S&apos;moresUp</td>
                    <td className="p-3">iOS, Android</td>
                    <td className="p-3">Core free after 45-day trial</td>
                    <td className="p-3 whitespace-nowrap">$9.99/mo · $99.99/yr</td>
                    <td className="p-3">Unclear</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">Kid Chore</td>
                    <td className="p-3">iOS, Android</td>
                    <td className="p-3">Limits unstated</td>
                    <td className="p-3 whitespace-nowrap">$3.99/mo · $29.99/yr · $69.99 life</td>
                    <td className="p-3">6-character code</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">ChoresFlow</td>
                    <td className="p-3">Web</td>
                    <td className="p-3">1 child</td>
                    <td className="p-3 whitespace-nowrap">$4.99/mo</td>
                    <td className="p-3">4-digit PIN</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">KidKarma</td>
                    <td className="p-3">iOS, Android</td>
                    <td className="p-3">None (14-day trial)</td>
                    <td className="p-3 whitespace-nowrap">$4.99 to $7.99/mo</td>
                    <td className="p-3">QR code scan</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">NestBoard</td>
                    <td className="p-3">Web, iOS, Android</td>
                    <td className="p-3">None (14-day trial)</td>
                    <td className="p-3 whitespace-nowrap">$4.99/mo household</td>
                    <td className="p-3">Free kid seats, no account</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">BusyKid</td>
                    <td className="p-3">iOS, Android</td>
                    <td className="p-3">None</td>
                    <td className="p-3 whitespace-nowrap">$4/mo billed annually</td>
                    <td className="p-3">Own login + prepaid card</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-gray-900 dark:text-white">Greenlight</td>
                    <td className="p-3">iOS, Android</td>
                    <td className="p-3">None</td>
                    <td className="p-3 whitespace-nowrap">From $5.99/mo</td>
                    <td className="p-3">Own login + debit card</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All prices and limits as stated by each app on September 15, 2026.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How to Pick</h2>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>You want zero dollars, ever, with unlimited kids:</strong>{' '}
                MyChoreBoard if you want apps in the store, Tasklio if a browser tab is
                fine and you want parent approval built in.
              </li>
              <li>
                <strong>You want the most proven app and no gamification:</strong>{' '}
                Chorsee, if the unstated free limits don&apos;t bother you.
              </li>
              <li>
                <strong>You want your kid to run their own day on a shared tablet,
                with routines and timers:</strong> ChoreStar. We built it for exactly
                that.
              </li>
              <li>
                <strong>Two households:</strong> KidKarma (paid) or MyChoreBoard (free).
              </li>
              <li>
                <strong>Real money on a card:</strong> BusyKid or Greenlight.
              </li>
            </ul>

            <p className="text-gray-700 dark:text-gray-300">
              Every app on this page beats the paper chart that keeps sliding off the
              fridge. Pick the one that fits your family, put it on the tablet the kids
              already fight over, and see who checks something off first.
            </p>

            <div className="not-prose my-8 text-center">
              <AppStoreBadge />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                ChoreStar is free for 3 kids and 20 chores, on the web and the App Store.
              </p>
            </div>
          </div>

          <BlogPostExtras slug="best-free-chore-apps-for-kids" />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
