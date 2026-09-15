import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { FAQ_DATA } from '@/components/help/faq-modal'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ChoreStar FAQ: Setup, Kid Login, Rewards, and Billing',
  description:
    'Plain answers about ChoreStar: adding kids, chore rewards, PIN-based kid login with no email, family sharing, vacation mode, and what the free plan includes.',
  keywords: [
    'chore app faq',
    'chorestar help',
    'kid login without email',
    'chore app free plan',
    'allowance tracker questions',
  ],
  alternates: { canonical: 'https://chorestar.app/faq' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_DATA.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

export default function FaqPage() {
  const categories = [...new Set(FAQ_DATA.map((f) => f.category))]
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Plain answers about setup, rewards, kid login, and billing. Anything
            missing? Write to{' '}
            <a href="mailto:hi@chorestar.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              hi@chorestar.app
            </a>
            . We read every message.
          </p>
        </header>

        {categories.map((category) => (
          <section key={category} className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{category}</h2>
            <div className="space-y-4">
              {FAQ_DATA.filter((f) => f.category === category).map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-gray-200 bg-white p-5 open:shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <summary className="cursor-pointer list-none font-semibold text-gray-900 dark:text-white">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white mb-2">More help</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Step-by-step setup lives in the{' '}
            <Link href="/how-to" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              how-to guides
            </Link>
            , and the{' '}
            <Link href="/compare" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              comparison pages
            </Link>{' '}
            cover how ChoreStar differs from other chore and allowance apps.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
