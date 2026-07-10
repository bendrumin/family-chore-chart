import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'A Kids Chore & Allowance App With No Debit Card or Bank Account',
  description:
    'Track chores and allowance without opening a bank account or giving your child a debit card. ChoreStar keeps you in control of real money — free to start, no KYC, no card.',
  keywords: [
    'chore app without debit card',
    'allowance app no bank account',
    'kids chore app no card',
    'allowance tracker without debit card',
    'greenlight alternative no card',
    'kids allowance app no bank',
    'chore and allowance app no debit card',
  ],
  openGraph: {
    title: 'A Kids Chore & Allowance App With No Debit Card',
    description:
      'Track chores and allowance with no bank account and no card for your child. You stay in control of real money.',
    url: 'https://chorestar.app/compare/chore-app-without-debit-card',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Kids Chore & Allowance App With No Debit Card',
    description: 'No bank account, no card for your kid. Free to start.',
  },
  alternates: { canonical: 'https://chorestar.app/compare/chore-app-without-debit-card' },
}

const rows = [
  { feature: 'Bank account required', chorestar: 'No', them: 'Yes — linked & verified' },
  { feature: 'Identity verification (KYC / SSN)', chorestar: 'No', them: 'Yes' },
  { feature: 'Physical card for your child', chorestar: 'No', them: 'Yes — a real debit card' },
  { feature: 'Who holds the real money', chorestar: 'You do — hand it out your way', them: 'Loaded onto the card' },
  { feature: 'Cost to start', chorestar: 'Free', them: 'Monthly subscription' },
  { feature: 'Chores & allowance tracking', chorestar: 'Yes — per-chore or flat', them: 'Yes' },
  { feature: 'Step-by-step routines with timers', chorestar: 'Yes', them: 'Not their focus' },
  { feature: 'Kid login without email', chorestar: 'Family code + PIN', them: 'Own app account' },
]

const faqs = [
  {
    q: 'Is there a kids chore and allowance app that does not require a debit card?',
    a: 'Yes — ChoreStar. Apps like Greenlight, GoHenry (now Acorns Early in the US), and BusyKid are built around a real debit card and require linking a bank account and verifying your identity. ChoreStar tracks chores and allowance without any of that: no card, no bank link, no KYC. You keep control of the actual money and pay it out however you already do — cash, transfer, or into their own savings.',
  },
  {
    q: 'Why would I want allowance tracking without a card?',
    a: 'A card means a monthly subscription, a bank connection, identity checks, and handing a young child a payment card. Many parents just want to track what a child has earned and teach the habit — without the fintech overhead or the risk of a lost card. ChoreStar keeps the money in your hands while still showing kids their balance grow.',
  },
  {
    q: 'How much does a debit-card app cost versus ChoreStar?',
    a: 'Debit-card apps charge a monthly subscription — for example, Acorns Early (formerly GoHenry in the US) is about $8/month for up to four kids as of mid-2026, and others are similar. ChoreStar is free for up to 3 children and 20 chores, with optional Premium at $4.99/month, $49.99/year, or a one-time $149.99 lifetime.',
  },
  {
    q: 'Does ChoreStar teach kids about money without a card?',
    a: 'Yes. You set a reward per chore (or a flat daily rate), and ChoreStar tallies earnings automatically with weekly summaries. Kids see exactly what they earned and can watch it add up — the money lesson without a bank account or plastic.',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'A Kids Chore & Allowance App With No Debit Card or Bank Account',
  description:
    'Track chores and allowance without a bank account or a debit card for your child. ChoreStar keeps you in control of real money.',
  url: 'https://chorestar.app/compare/chore-app-without-debit-card',
  datePublished: '2026-07-02',
  dateModified: '2026-07-02',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://chorestar.app/compare/chore-app-without-debit-card' },
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
    { '@type': 'ListItem', position: 3, name: 'Chore App Without a Debit Card', item: 'https://chorestar.app/compare/chore-app-without-debit-card' },
  ],
}

export default function ChoreAppNoDebitCardPage() {
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
              No debit card required
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              A kids chore &amp; allowance app with no debit card
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Apps like Greenlight, GoHenry (now Acorns Early in the US), and BusyKid are really debit
              cards for kids — they need a linked bank account, identity verification, and a monthly
              fee. If you just want to track chores and allowance without handing a 7-year-old a
              payment card, ChoreStar does exactly that, free to start.
            </p>
          </header>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                ChoreStar vs. kids debit-card apps
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[560px] border-collapse bg-white dark:bg-gray-800 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 w-[34%]"><span className="sr-only">Feature</span></th>
                      <th className="text-center p-4 font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20">ChoreStar</th>
                      <th className="text-center p-4 font-bold text-gray-900 dark:text-white">Debit-card apps</th>
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
                &ldquo;Debit-card apps&rdquo; describes products like Greenlight, GoHenry / Acorns Early,
                and BusyKid. Their pricing and features change — check their sites for the latest.
              </p>
            </section>

            <section className="prose prose-gray dark:prose-invert max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You keep control of the real money</h2>
              <p className="text-gray-700 dark:text-gray-300">
                With a debit-card app, you load real money onto a card your child carries. That&apos;s
                powerful for teaching real-world spending — but it also means a bank connection,
                identity verification, a monthly subscription, and a card that can be lost. ChoreStar
                takes a lighter approach: it tracks what each child has <em>earned</em>, and you hand out
                the money however you already do. No card, no bank link, no KYC.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                You still get the money lesson. Set a reward per chore or a flat daily rate, and
                ChoreStar tallies earnings automatically with weekly summaries so kids can watch their
                balance grow. And because kids log in with a family code and a 4-digit PIN, there&apos;s
                no email or personal account required for your children.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">When a debit-card app is the better choice</h2>
              <p className="text-gray-700 dark:text-gray-300">
                If your main goal is real-world spending, saving, and even investing with an actual card
                — and you&apos;re comfortable linking a bank and verifying your identity — a debit-card
                app like Greenlight or Acorns Early is purpose-built for that. ChoreStar is the better
                fit when you want chores, routines, and allowance <em>tracking</em> without the banking
                overhead, and you&apos;d rather keep real money in your own hands.
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
              <h2 className="text-2xl md:text-3xl font-black mb-3">No card. No bank. Just chores that pay off.</h2>
              <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
                Track chores and allowance in minutes — free for up to 3 kids and 20 chores.
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
