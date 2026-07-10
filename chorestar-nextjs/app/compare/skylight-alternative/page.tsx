import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'The Best Skylight Chore Chart Alternative (No Wall Device)',
  description:
    'Want a Skylight-style chore chart without buying a $160+ touchscreen? ChoreStar runs on the phones and tablets you already own — free to start, with routines, timers, and PIN-based kid login.',
  keywords: [
    'skylight alternative',
    'skylight calendar alternative',
    'skylight chore chart alternative',
    'chore app instead of skylight',
    'chore chart without a device',
    'skylight calendar chores',
    'family chore app no hardware',
  ],
  openGraph: {
    title: 'The Best Skylight Chore Chart Alternative',
    description:
      'Skylight-style chore tracking without buying a wall device. ChoreStar runs on the devices you already own — free to start.',
    url: 'https://chorestar.app/compare/skylight-alternative',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Best Skylight Chore Chart Alternative',
    description: 'A chore chart without buying a $160+ device — free to start.',
  },
  alternates: { canonical: 'https://chorestar.app/compare/skylight-alternative' },
}

const rows = [
  { feature: 'Cost to start', chorestar: 'Free (up to 3 kids, 20 chores)', them: 'Buy a device — $159.99+' },
  { feature: 'Physical hardware', chorestar: 'None — uses your phone/tablet/computer', them: 'Wall-mounted touchscreen required' },
  { feature: 'Where kids use it', chorestar: 'Their own device, anywhere', them: 'Shared screen in one room' },
  { feature: 'Kid login', chorestar: 'Family code + 4-digit PIN', them: 'Tap the shared screen (no personal login)' },
  { feature: 'Chore chart & rewards', chorestar: 'Yes — points, badges, streaks', them: 'Yes — chore chart with stars' },
  { feature: 'Step-by-step routines with timers', chorestar: 'Yes — a core feature', them: 'Not its focus' },
  { feature: 'Ongoing cost', chorestar: 'Free, or $4.99/mo · $49.99/yr · $149.99 lifetime', them: 'Optional subscription ~$39/yr for advanced features' },
]

const faqs = [
  {
    q: 'Is there a Skylight alternative that does not require buying a device?',
    a: 'Yes. Skylight is a wall-mounted touchscreen you purchase (roughly $160 and up as of mid-2026). ChoreStar is an app that runs on the phones, tablets, and computers your family already owns, so there is no hardware to buy and nothing to mount. You can start free.',
  },
  {
    q: 'Can kids check off their own chores in ChoreStar like they do on a Skylight screen?',
    a: 'Yes — and from anywhere, not just one room. Each child logs in with your family code and their own 4-digit PIN, then checks off chores and runs their routines on any device. Skylight uses a single shared screen mounted in a common area.',
  },
  {
    q: 'What does ChoreStar do that a chore chart on a wall device may not?',
    a: 'ChoreStar is built around step-by-step routines: kids run a morning, bedtime, or afterschool routine one task at a time, with an optional per-step timer, a progress bar, and a confetti celebration at the end. It also tracks allowance flexibly and awards badges and streaks.',
  },
  {
    q: 'How much does ChoreStar cost compared to Skylight?',
    a: 'ChoreStar is free for up to 3 children and 20 chores. Premium is $4.99/month or $49.99/year, with a one-time $149.99 lifetime option. Skylight requires buying the device first (about $160+ as of mid-2026), with an optional ~$39/year subscription for advanced features.',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Best Skylight Chore Chart Alternative (No Wall Device)',
  description:
    'How ChoreStar compares to a Skylight chore chart — no hardware to buy, PIN-based kid login, and step-by-step routines with timers.',
  url: 'https://chorestar.app/compare/skylight-alternative',
  datePublished: '2026-07-02',
  dateModified: '2026-07-02',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://chorestar.app/compare/skylight-alternative' },
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
    { '@type': 'ListItem', position: 3, name: 'Skylight Alternative', item: 'https://chorestar.app/compare/skylight-alternative' },
  ],
}

export default function SkylightAlternativePage() {
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
              Skylight alternative
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              A Skylight-style chore chart — without buying the wall device
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Skylight&apos;s chore chart lives on a touchscreen you mount in the kitchen — a lovely
              device, but it starts around $160 and everything happens on that one shared screen.
              ChoreStar gives every kid their own chore chart and routines on the phones and tablets
              you already own, free to start.
            </p>
          </header>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                ChoreStar vs. a Skylight chore chart
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[560px] border-collapse bg-white dark:bg-gray-800 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 w-[34%]"><span className="sr-only">Feature</span></th>
                      <th className="text-center p-4 font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20">ChoreStar</th>
                      <th className="text-center p-4 font-bold text-gray-900 dark:text-white">Skylight</th>
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
                Skylight pricing and features per skylightframe.com, observed July 2026 (MSRP; Skylight
                often runs promotions). Check their site for the latest.
              </p>
            </section>

            <section className="prose prose-gray dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Why families pick ChoreStar instead</h2>
              <p className="text-gray-700 dark:text-gray-300">
                The biggest difference is simple: there&apos;s nothing to buy or mount. A wall display
                is great if you want an always-on family calendar in the kitchen, but it also means the
                chore chart is tied to one screen in one room — and it starts at a real hardware price.
                ChoreStar puts each child&apos;s chores on the device in their hand, so a kid can check
                off &ldquo;made my bed&rdquo; from their own tablet upstairs.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                ChoreStar is also built around <strong>routines</strong>, not just a chart. Kids run a
                morning or bedtime routine one step at a time, with an optional timer per step, a
                progress bar, and a celebration when they finish. And every child logs in with just a
                family code and a 4-digit PIN — no email and no personal account for your kids.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">When Skylight is the better choice</h2>
              <p className="text-gray-700 dark:text-gray-300">
                We&apos;ll be honest: if what you really want is a big, always-on touchscreen on the
                wall that the whole family glances at for the shared calendar, meal plans, and chores —
                and you&apos;re happy to buy the hardware — a Skylight (or similar smart display) is a
                genuinely nice product. ChoreStar is the better fit if you&apos;d rather use the devices
                you already own, want per-kid routines and gamification, and prefer to start free.
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
              <h2 className="text-2xl md:text-3xl font-black mb-3">No device to buy. Start free.</h2>
              <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
                Set up your family in under two minutes on the phone or tablet you&apos;re holding right now.
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
