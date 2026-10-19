import Link from 'next/link'
import { PublicPageShell } from '@/components/layout/public-page-shell'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { BlogPostExtras } from '@/components/blog/blog-post-extras'
import { AppStoreBadge } from '@/components/home/app-store-badge'
import type { Metadata } from 'next'

const TITLE = 'Spend, Save, Give: Teaching Kids Money with Jars and a Weekly Allowance'
const DESCRIPTION =
  'Three jars, a fixed payday, a little interest on savings, and a fair way to handle fines. A short guide to teaching kids money with spend, save and give jars, and how ChoreStar now runs it for you.'
const URL = 'https://chorestar.app/blog/spend-save-give-jars-allowance-for-kids'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'spend save give jars',
    'three jar system for kids',
    'how much allowance for kids',
    'weekly allowance app',
    'teaching kids about money',
    'allowance tracker app',
    'kids savings interest',
    'screen time as a reward',
  ],
  openGraph: {
    type: 'article',
    publishedTime: '2026-10-19',
    images: ['/og-image.png'],
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: TITLE,
  image: 'https://chorestar.app/og-image.png',
  description: DESCRIPTION,
  url: URL,
  datePublished: '2026-10-19',
  dateModified: '2026-10-19',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What split should I use for spend, save and give jars?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '70% spend, 20% save, 10% give is a good start for most kids. Younger kids do better with more in Spend so the reward feels real; older kids saving for something big can move to 50/40/10.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much weekly allowance should a kid get?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A common rule of thumb is half to one dollar per year of age per week. The exact number matters less than paying it on the same day every week.',
      },
    },
    {
      '@type': 'Question',
      name: 'Should allowance depend on chores?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Many families split it: a base allowance that only pays when most of the week\'s chores got done (for example 80%), plus extra money for bigger jobs.',
      },
    },
  ],
}

export default function SpendSaveGiveJarsPage() {
  return (
    <PublicPageShell>
      <SiteNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-600 dark:text-indigo-400 themed-text hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 themed-text">Parenting</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">October 19, 2026</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">5 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Your kid earned eleven dollars this month. By Sunday it was a slushie, a pack of
              cards and a vague memory. Money that all lands in one pile gets spent from one
              pile. Three jars and a fixed payday fix most of that, and they work at six or at
              twelve.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Split Every Dollar into Three Jars</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Spend is for now. Save is for something bigger. Give is for someone else. Pick a
              split, say 70/20/10, and every bit of money that comes in gets divided the moment
              it arrives. The kid never has to decide to save. It already happened.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Keep the rules simple. Treats come out of Spend. The scooter comes out of Save. Give
              goes to a cause the kid picks, and they should see it go: the animal shelter, a
              classmate&apos;s fundraiser, coins in the jar at the bakery.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Pay on the Same Day Every Week</h2>
            <p className="text-gray-700 dark:text-gray-300">
              A weekly allowance teaches more than the amount does. A fixed payday means the kid
              can plan: three more days and I can get it. Half to one dollar per year of age is a
              common range. If you want it tied to effort, make it conditional on most of the
              week&apos;s chores, around 80%, so one missed Tuesday doesn&apos;t cost the whole week.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. Pay a Little Interest on Savings</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Compound interest is abstract until your own ten dollars turns into ten dollars and
              twenty cents. Pay a small weekly percentage on the Save jar, 1 or 2 percent, and cap
              it so a big birthday check doesn&apos;t bankrupt you. Waiting now visibly pays.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. Handle Fines and Paybacks Out Loud</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Real money comes with real costs. If a kid breaks a window or wants a phone with a
              monthly bill, it is fair for some of that to come out of their money. Two rules keep
              it fair: always say why, in writing they can see, and don&apos;t take more than they
              have unless you both agreed to a payback plan.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What ChoreStar Does Now</h2>
            <p className="text-gray-700 dark:text-gray-300">
              This week&apos;s update puts all of it into ChoreStar Premium:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>Spend, Save and Give jars.</strong> Pick a split per kid. Everything they
                earn from that day on lands in three jars; what they earned before stays in Spend.
                The reward store spends from Spend and savings goals fill from Save.
              </li>
              <li>
                <strong>Automatic weekly allowance.</strong> A fixed amount on the weekday you
                choose, in your timezone, optionally only when they hit a chore threshold.
              </li>
              <li>
                <strong>Interest on Save.</strong> A weekly percentage you pay, capped at 10% and
                $5 a week.
              </li>
              <li>
                <strong>Fines and paybacks.</strong> Take money off with a reason, or set a weekly
                repayment like &ldquo;phone bill, $2 a week&rdquo;. It never goes below zero unless
                you allow it, and your kid sees every one.
              </li>
              <li>
                <strong>Screen-time minutes.</strong> Chores and routines can earn minutes as well
                as money. Kids bank them on their dashboard and you mark them used. ChoreStar
                doesn&apos;t lock any device; you stay the referee.
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              It&apos;s set up from Settings, Rewards on the web dashboard, and kids see their jars
              on their own login. Premium is $4.99 a month or $49.99 a year, and the free plan (3
              kids, 20 chores, routines, a savings goal and a starter reward store) stays free.
            </p>

            <div className="not-prose my-8 text-center">
              <Link
                href="/signup"
                className="accent-fill accent-fill-hover inline-block px-6 py-3 rounded-xl font-bold shadow-lg"
              >
                Start free
              </Link>
              <div className="mt-6">
                <AppStoreBadge />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Answers</h2>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">What split should we start with?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              70/20/10. Move toward 50/40/10 when they are saving for something big.
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">What if they want to spend their savings?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Let them sometimes. Savings with no way out feel like a tax. Paying out a goal is
              the happy version: the jar empties and the scooter shows up.
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Does a fine teach anything?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Only with a reason attached and an amount that fits. Small, written down and rare
              works. Frequent fines just teach a kid to stop checking their balance.
            </p>
          </div>

          <BlogPostExtras slug="spend-save-give-jars-allowance-for-kids" />
        </article>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
