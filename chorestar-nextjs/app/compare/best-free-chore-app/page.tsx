import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'The Best Free Chore App for Kids (2026)',
  description:
    'What to look for in a genuinely free chore chart app for kids — and how ChoreStar’s free plan compares to paid apps, debit-card apps, and wall devices.',
  keywords: [
    'best free chore app for kids',
    'free chore chart app',
    'free chore app',
    'free kids chore app',
    'free allowance tracker for kids',
    'free chore chart app no ads',
  ],
  openGraph: {
    title: 'The Best Free Chore App for Kids (2026)',
    description:
      'What actually makes a free chore app worth using — and how ChoreStar’s free plan stacks up.',
    url: 'https://chorestar.app/compare/best-free-chore-app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Best Free Chore App for Kids (2026)',
    description: 'What to look for in a free chore app — and how ChoreStar compares.',
  },
  alternates: { canonical: 'https://chorestar.app/compare/best-free-chore-app' },
}

const checklist = [
  {
    title: 'Free that stays useful',
    desc: 'Some apps are “free” but lock the basics behind a trial or a paywall. Look for a free tier you can actually run a family on. ChoreStar’s free plan covers up to 3 children and 20 chores, kid PIN login, points and earnings, badges, and weekly reports — no trial clock.',
  },
  {
    title: 'Kids can use it independently',
    desc: 'A chore app only helps if kids actually open it. Look for a real kid mode. In ChoreStar, children log in with a family code and a 4-digit PIN — no email, no parent handing over their phone.',
  },
  {
    title: 'Routines, not just a checklist',
    desc: 'The best free apps help with the hard parts of the day. ChoreStar includes step-by-step morning, bedtime, and afterschool routines with optional timers and a celebration at the finish.',
  },
  {
    title: 'Still actively maintained',
    desc: 'A few well-known “free” chore apps have gone quiet — broken logins, closed help centers, no updates. Check that the app is current before you build your family’s week around it.',
  },
  {
    title: 'No hardware or bank account needed',
    desc: 'You shouldn’t have to buy a wall device or link a bank account just to track chores. ChoreStar runs on the phones, tablets, and computers you already own, and tracks allowance without a card.',
  },
]

const faqs = [
  {
    q: 'What is the best free chore app for kids?',
    a: 'ChoreStar has a genuinely free plan built for families: up to 3 children and 20 chores, kid login with a PIN (no email), points and allowance tracking, achievement badges, step-by-step routines, and weekly progress reports — with nothing to buy and no bank account required.',
  },
  {
    q: 'Is ChoreStar really free?',
    a: 'Yes. The free plan is free forever for up to 3 children and 20 chores, with no credit card required to start. If you need unlimited children and chores, family sharing, or premium themes, Premium is $4.99/month or $49.99/year, with a one-time $149.99 lifetime option — but you never have to upgrade.',
  },
  {
    q: 'Do free chore apps require a debit card or bank account?',
    a: 'Some do — apps built around a kids debit card (like Greenlight or GoHenry/Acorns Early) require linking a bank account and usually charge a monthly fee. ChoreStar does not: it tracks chores and allowance with no card and no bank link.',
  },
  {
    q: 'Can kids log in to a free chore app without an email?',
    a: 'With ChoreStar, yes. Parents set a 4-digit PIN per child, and kids log in with the family code plus their PIN. No email address or personal account is required for children.',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Best Free Chore App for Kids (2026)',
  description:
    'What to look for in a free chore chart app for kids, and how ChoreStar’s free plan compares.',
  url: 'https://chorestar.app/compare/best-free-chore-app',
  datePublished: '2026-07-02',
  dateModified: '2026-07-02',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://chorestar.app/compare/best-free-chore-app' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chorestar.app' },
    { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://chorestar.app/compare' },
    { '@type': 'ListItem', position: 3, name: 'Best Free Chore App', item: 'https://chorestar.app/compare/best-free-chore-app' },
  ],
}

export default function BestFreeChoreAppPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/compare" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← All comparisons
        </Link>

        <article>
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-3">
              Buyer’s guide
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              The best free chore app for kids
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              &ldquo;Free&rdquo; means a lot of different things in the chore-app world — free-with-ads,
              free-trial, or free-but-abandoned. Here&apos;s what actually makes a free chore app worth
              building your week around, and how ChoreStar&apos;s free plan measures up.
            </p>
          </header>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                What to look for in a free chore app
              </h2>
              <div className="space-y-4">
                {checklist.map(({ title, desc }) => (
                  <div key={title} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <span className="text-emerald-500 dark:text-emerald-400" aria-hidden="true">✓</span>
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="prose prose-gray dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What ChoreStar’s free plan includes</h2>
              <p className="text-gray-700 dark:text-gray-300">
                ChoreStar is free forever for up to 3 children and 20 chores — no credit card to start.
                The free plan isn&apos;t a stripped-down demo: kids get their own PIN login, points and
                earnings tracking, achievement badges, step-by-step routines, and weekly progress
                reports. You only need Premium if you want unlimited children and chores, family sharing
                with a co-parent, or premium themes.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Just as important, there&apos;s no hardware to buy and no bank account to link. Compared
                to a wall device (which you purchase) or a kids debit-card app (which needs a linked bank
                and a monthly fee), a free app that runs on the devices you already own is the lowest-risk
                way to see whether a chore system will actually stick for your family.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently asked questions</h2>
              <div className="space-y-4">
                {faqs.map((f) => (
                  <details key={f.q} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between gap-4">
                      {f.q}
                      <span className="text-indigo-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                    </summary>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            <section className="text-center bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-10 text-white">
              <h2 className="text-2xl md:text-3xl font-black mb-3">Start free — and stay free</h2>
              <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
                Up to 3 kids and 20 chores, free forever. No hardware, no bank account, no credit card to start.
              </p>
              <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg">
                Start Free Today →
              </Link>
            </section>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
