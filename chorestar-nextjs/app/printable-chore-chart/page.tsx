import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { PrintableChartBuilder } from '@/components/printable/printable-chart-builder'

const URL = 'https://chorestar.app/printable-chore-chart'

export const metadata: Metadata = {
  title: 'Free Printable Chore Chart for Kids (PDF, No Signup)',
  description:
    'Make a free printable weekly chore chart for your kids in a minute. Pick their age for starter chores, add allowance amounts if you like, and download a PDF. No account needed.',
  keywords: [
    'free printable chore chart',
    'printable chore chart for kids',
    'weekly chore chart pdf',
    'chore chart template',
    'kids chore chart printable',
    'allowance chore chart printable',
    'chore chart by age',
  ],
  openGraph: {
    images: ['/og-image.png'],
    title: 'Free Printable Chore Chart for Kids',
    description: 'Pick an age, edit the chores, download a PDF. No account needed.',
    url: URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Printable Chore Chart for Kids',
    description: 'Pick an age, edit the chores, download a PDF. No account needed.',
  },
  alternates: { canonical: URL },
}

const faqs = [
  {
    q: 'Is this chore chart really free?',
    a: 'Yes. There is no account, no email and no watermark beyond a small line at the bottom. The PDF is made in your browser, so the names and chores you type never leave your device.',
  },
  {
    q: 'Can I reuse it every week?',
    a: 'Yes. The chart prints with a blank "Week of" line, so you can print a stack of copies or slip one into a sheet protector and use a dry erase marker.',
  },
  {
    q: 'How many chores should a chart have?',
    a: 'Fewer than you think. Three to five daily chores is plenty for most kids under 10, and a short list they finish beats a long one they give up on. Add one more once the first set is a habit.',
  },
  {
    q: 'Should chores be tied to allowance?',
    a: 'Families do it both ways. Some pay per chore, some pay a flat weekly amount for a full chart, and some keep everyday chores unpaid and pay only for extras. Tick "Show allowance per chore" if you want the amounts on the chart and a weekly total at the bottom.',
  },
  {
    q: 'What if my kids lose interest in a paper chart?',
    a: 'Most charts fade after a few weeks once the novelty wears off. ChoreStar is the app version: each kid checks off chores on a phone or tablet with a 4-digit PIN, allowance adds itself up, and streaks, badges and a Star Pet that grows with every chore keep it interesting. It is free for up to 3 kids.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Free Printable Chore Chart Maker',
  url: URL,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chorestar.app' },
    { '@type': 'ListItem', position: 2, name: 'Printable Chore Chart', item: URL },
  ],
}

const tips = [
  {
    title: 'Start small',
    body: 'Three to five chores they can actually finish. Success in week one matters more than coverage.',
  },
  {
    title: 'Put it where the chores happen',
    body: 'The fridge or the back of their bedroom door, at their eye level, with a pen tied to it.',
  },
  {
    title: 'Let them do the checking',
    body: 'Kids care more about a chart they mark themselves than one a parent fills in for them.',
  },
  {
    title: 'Look at it together on Sunday',
    body: 'Count the checks, pay out if you pay, and swap one chore if something is not working.',
  },
]

export default function PrintableChoreChartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            Free, no signup
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
            Free printable chore chart for kids
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Pick your kid&apos;s age for a starter list, change anything you like, and download a weekly chart as a PDF.
            It takes about a minute and you don&apos;t need an account.
          </p>
        </header>

        <PrintableChartBuilder />

        <div className="space-y-12 mt-14">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">How to make a chore chart stick</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {tips.map((t) => (
                <div key={t.title} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{t.body}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-5">
              Not sure what fits your kid? See{' '}
              <Link href="/blog/age-appropriate-chores-by-age" className="text-indigo-600 dark:text-indigo-400 underline">
                age-appropriate chores by age
              </Link>{' '}
              and{' '}
              <Link href="/blog/split-chores-fairly-between-siblings" className="text-indigo-600 dark:text-indigo-400 underline">
                how to split chores fairly between siblings
              </Link>
              .
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
            <h2 className="text-2xl md:text-3xl font-black mb-3">The chart that checks itself</h2>
            <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
              ChoreStar puts the same chart on your kids&apos; phone or tablet. They check off chores with a PIN, allowance
              adds itself up, and you see it all from your phone. Free for up to 3 kids and 20 chores.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Start free
            </Link>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
