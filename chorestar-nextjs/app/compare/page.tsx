import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  COMPARISON_PAGES,
  isPositive,
  isNegative,
} from '@/lib/constants/comparison'

export const metadata: Metadata = {
  title: 'ChoreStar vs the Alternatives: Chore Apps, Smart Displays & Kids Cards',
  description:
    'How ChoreStar compares to smart-display chore charts (like Skylight), kids debit-card apps (like Greenlight), and basic chore-list apps — no hardware, no bank account, and no email for your kids.',
  keywords: [
    'chore app comparison',
    'best chore app for kids',
    'chore chart app alternative',
    'chore app vs',
    'kids chore app without debit card',
    'chore app no email for kids',
    'skylight alternative',
    'greenlight alternative for chores',
  ],
  openGraph: {
    title: 'ChoreStar vs the Alternatives',
    description:
      'Compare ChoreStar to smart displays, kids debit-card apps, and basic chore apps. No hardware, no bank account, no email for kids.',
    url: 'https://chorestar.app/compare',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChoreStar vs the Alternatives',
    description: 'No hardware, no bank account, no email for kids. See how ChoreStar compares.',
  },
  alternates: { canonical: 'https://chorestar.app/compare' },
}

const faqs = [
  {
    q: 'What is the best alternative to a Skylight chore chart?',
    a: 'If you want Skylight-style chore tracking without buying a wall device, ChoreStar runs on the phones, tablets, and computers you already own. It is free to start, adds step-by-step routines with timers, and lets kids log in with a family code and PIN — no hardware and no kid email required.',
  },
  {
    q: 'Is there a kids chore and allowance app that does not need a debit card?',
    a: 'Yes. Debit-card apps like Greenlight and GoHenry are built around a real card and require linking a bank account. ChoreStar tracks chores and allowance without a card or bank — you stay in control of real money and hand it out however you already do.',
  },
  {
    q: 'Do kids need their own email or account to use ChoreStar?',
    a: 'No. Parents set a 4-digit PIN for each child, and kids log in with the family code plus their PIN. No email address and no personal account are required for children, which keeps their data private.',
  },
  {
    q: 'How much does ChoreStar cost?',
    a: 'ChoreStar is free for up to 3 children and 20 chores. Premium is $4.99/month or $49.99/year for unlimited children and chores, family sharing, and premium themes. A one-time $149.99 lifetime option is also available.',
  },
]

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
  ],
}

const differentiators = [
  {
    icon: '📱',
    title: 'No hardware to buy',
    desc: 'Smart-display chore charts (like Skylight) start with a wall device. ChoreStar runs on the phones, tablets, and computers your family already has — nothing to mount, nothing to ship.',
  },
  {
    icon: '🚫💳',
    title: 'No bank account or debit card',
    desc: 'Kids debit-card apps require KYC, a linked bank, and a card for your child. ChoreStar tracks allowance virtually so you stay in control of real money — no card for a 7-year-old.',
  },
  {
    icon: '🔑',
    title: 'No email for kids',
    desc: 'Children log in with a family code and a 4-digit PIN. No email, no personal account, no data collection on your kids — a genuinely COPPA-friendly design.',
  },
  {
    icon: '🎯',
    title: 'Routines, not just checkboxes',
    desc: 'Build morning, bedtime, and afterschool routines kids run one step at a time — with optional timers, a progress bar, and a confetti celebration at the finish.',
  },
]

const spokes = COMPARISON_PAGES.filter((p) => p.slug !== '')

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero */}
        <header className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-3">
            Compare
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-5">
            The chore app with no hardware, no bank account, and no email for kids
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            There are a lot of ways to get kids doing chores — a wall device, a debit card, or a
            basic checklist app. Here&apos;s an honest look at how ChoreStar compares, and when a
            different option might fit your family better.
          </p>
        </header>

        {/* Comparison table */}
        <section aria-labelledby="comparison-heading" className="mb-16">
          <h2 id="comparison-heading" className="sr-only">
            Feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full min-w-[640px] border-collapse bg-white dark:bg-gray-800 text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-4 font-semibold text-gray-500 dark:text-gray-400 w-[30%]">
                    <span className="sr-only">Feature</span>
                  </th>
                  {COMPARISON_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`text-center p-4 align-bottom ${
                        col.highlight
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl'
                          : ''
                      }`}
                    >
                      <div
                        className={`font-bold ${
                          col.highlight
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {col.label}
                      </div>
                      <div className="text-xs font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                        {col.note}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''}
                  >
                    <th
                      scope="row"
                      className="text-left p-4 font-medium text-gray-700 dark:text-gray-300"
                    >
                      {row.feature}
                    </th>
                    {COMPARISON_COLUMNS.map((col) => {
                      const value = row.values[col.key]
                      const pos = isPositive(value)
                      const neg = isNegative(value)
                      return (
                        <td
                          key={col.key}
                          className={`text-center p-4 ${
                            col.highlight ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''
                          }`}
                        >
                          <span
                            className={
                              pos
                                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                : neg
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-700 dark:text-gray-300'
                            }
                          >
                            {pos && <span aria-hidden="true">✓ </span>}
                            {value}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
            Comparison reflects typical products in each category. Competitor pricing and features
            change — check their sites for the latest.
          </p>
        </section>

        {/* Differentiators */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
            What makes ChoreStar different
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            The whole product is built around one idea: kids should be able to run their own chores
            independently, without you buying hardware or handing a child a bank card.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {differentiators.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Honest guidance — builds trust */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
              Which one is right for you?
            </h2>
            <div className="space-y-5 text-gray-700 dark:text-gray-300">
              <p>
                <strong className="text-gray-900 dark:text-white">Choose ChoreStar</strong> if you
                want kids to build chore and routine habits on devices you already own, with
                gamification and flexible allowance tracking — and you&apos;d rather not buy hardware
                or open a bank account.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">A smart display</strong> (like
                Skylight) may fit if what you really want is an always-on screen on the wall that
                doubles as a family calendar and command center, and you&apos;re happy to buy the
                device.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">A kids debit-card app</strong>{' '}
                (like Greenlight or GoHenry) makes sense if your main goal is real-world spending,
                saving, and investing with an actual card — and you&apos;re comfortable linking a
                bank and issuing your child a card.
              </p>
            </div>
          </div>
        </section>

        {/* Spoke links */}
        {spokes.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
              Detailed comparisons
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {spokes.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{page.description}</p>
                  <span className="inline-block mt-3 text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
              >
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-indigo-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-10 text-white">
          <h2 className="text-2xl md:text-3xl font-black mb-3">Try ChoreStar free</h2>
          <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
            Free for up to 3 kids and 20 chores. No hardware, no bank account, no credit card to
            start.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Start Free Today →
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
