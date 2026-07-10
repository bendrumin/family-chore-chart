import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'The Best Greenlight Alternative for Chores & Allowance',
  description:
    'Want Greenlight-style chores and allowance without the debit card, bank link, and monthly fee? ChoreStar tracks chores and allowance with no card and no bank — free to start.',
  keywords: [
    'greenlight alternative',
    'greenlight alternative for chores',
    'alternative to greenlight',
    'chore app like greenlight no card',
    'allowance app no debit card',
    'greenlight vs chorestar',
  ],
  openGraph: {
    title: 'The Best Greenlight Alternative for Chores & Allowance',
    description:
      'Chores and allowance tracking without a debit card, bank account, or monthly fee. Free to start.',
    url: 'https://chorestar.app/compare/greenlight-alternative',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Best Greenlight Alternative for Chores',
    description: 'No debit card, no bank link, no monthly fee. Free to start.',
  },
  alternates: { canonical: 'https://chorestar.app/compare/greenlight-alternative' },
}

const rows = [
  { feature: 'Core product', chorestar: 'Chore & routine app', them: 'Kids debit card + app' },
  { feature: 'Bank account required', chorestar: 'No', them: 'Yes — linked & verified' },
  { feature: 'Physical card for your child', chorestar: 'No', them: 'Yes' },
  { feature: 'Cost to start', chorestar: 'Free', them: 'Monthly subscription' },
  { feature: 'Who holds the real money', chorestar: 'You do', them: 'Loaded onto the card' },
  { feature: 'Step-by-step routines with timers', chorestar: 'Yes', them: 'Not their focus' },
  { feature: 'Gamification (badges, streaks, confetti)', chorestar: 'Yes', them: 'Light' },
  { feature: 'Kid login without email', chorestar: 'Family code + PIN', them: 'Own app account' },
]

const faqs = [
  {
    q: 'What is the best Greenlight alternative if I do not want a debit card?',
    a: 'ChoreStar. Greenlight is fundamentally a kids debit card with a companion app, so it requires linking a bank account, verifying your identity, and paying a monthly subscription. If your goal is really chores, routines, and allowance tracking — not a card — ChoreStar does that with no card, no bank link, and a free plan.',
  },
  {
    q: 'Does ChoreStar do allowance like Greenlight?',
    a: 'ChoreStar tracks allowance rather than moving real money. You set a reward per chore or a flat daily rate, and it tallies each child’s earnings automatically with weekly summaries. You hand out the actual money however you prefer, so there is no card to load or lose.',
  },
  {
    q: 'When is Greenlight still the better choice?',
    a: 'If your main goal is real-world spending, saving, and investing with an actual debit card — and you are comfortable linking a bank and verifying your identity — Greenlight is purpose-built for that. ChoreStar is the better fit when you want chores, routines, and allowance tracking without the banking overhead.',
  },
  {
    q: 'How much does ChoreStar cost?',
    a: 'ChoreStar is free for up to 3 children and 20 chores. Premium is $4.99/month or $49.99/year for unlimited children and chores, with a one-time $149.99 lifetime option.',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Best Greenlight Alternative for Chores & Allowance',
  description:
    'How ChoreStar compares to Greenlight for chores and allowance — no debit card, no bank account, no monthly fee required.',
  url: 'https://chorestar.app/compare/greenlight-alternative',
  datePublished: '2026-07-02',
  dateModified: '2026-07-02',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://chorestar.app/compare/greenlight-alternative' },
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
    { '@type': 'ListItem', position: 3, name: 'Greenlight Alternative', item: 'https://chorestar.app/compare/greenlight-alternative' },
  ],
}

export default function GreenlightAlternativePage() {
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
              Greenlight alternative
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              A Greenlight alternative for chores — without the debit card
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Greenlight is a kids debit card with a chores-and-allowance app attached. It&apos;s great
              for real-world spending — but it means a linked bank account, identity verification, a
              monthly fee, and a card for your child. If what you actually want is the chores and
              allowance part, ChoreStar does that with no card and no bank, free to start.
            </p>
          </header>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                ChoreStar vs. Greenlight
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[560px] border-collapse bg-white dark:bg-gray-800 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 w-[34%]"><span className="sr-only">Feature</span></th>
                      <th className="text-center p-4 font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20">ChoreStar</th>
                      <th className="text-center p-4 font-bold text-gray-900 dark:text-white">Greenlight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.feature} className={i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''}>
                        <th scope="row" className="text-left p-4 font-medium text-gray-700 dark:text-gray-300">{r.feature}</th>
                        <td className="text-center p-4 text-emerald-600 dark:text-emerald-400 font-medium bg-indigo-50/40 dark:bg-indigo-900/10">{r.chorestar}</td>
                        <td className="text-center p-4 text-gray-600 dark:text-gray-300">{r.them}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                Greenlight is a kids debit-card service; details reflect its product category as of July
                2026. Check greenlight.com for current pricing and features.
              </p>
            </section>

            <section className="prose prose-gray dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chores and habits, minus the banking</h2>
              <p className="text-gray-700 dark:text-gray-300">
                The reason to pick ChoreStar over Greenlight is scope. Greenlight is a financial product
                first — the chores exist to feed the card. ChoreStar is a chore and routine app first:
                kids run morning and bedtime routines one step at a time, earn points and badges, build
                streaks, and see their allowance add up — all without a card, a bank link, or a monthly
                requirement, and with a free plan for up to 3 kids.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Kids also log in with just a family code and a 4-digit PIN — no email and no personal
                account for your children, which keeps their data private.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">When Greenlight is the better choice</h2>
              <p className="text-gray-700 dark:text-gray-300">
                If your priority is teaching real spending, saving, and investing with an actual debit
                card your child carries, Greenlight is built for exactly that and does it well. Reach for
                ChoreStar when the goal is chores, routines, and allowance <em>tracking</em> — and
                you&apos;d rather keep the real money in your own hands.
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
              <h2 className="text-2xl md:text-3xl font-black mb-3">Chores that pay off — no card required</h2>
              <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
                Free for up to 3 kids and 20 chores. No bank account, no credit card to start.
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
