import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { BlogPostExtras } from '@/components/blog/blog-post-extras'
import { AppStoreBadge } from '@/components/home/app-store-badge'
import type { Metadata } from 'next'

const TITLE = 'How to Split Chores Fairly Between Siblings'
const DESCRIPTION =
  'Rotate the jobs nobody wants, post bonus jobs for whoever is fastest, and let each kid save for their own thing. A practical guide to sibling chore fairness, and how ChoreStar now does it for you.'
const URL = 'https://chorestar.app/blog/split-chores-fairly-between-siblings'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'chore rotation chart',
    'rotating chore chart for kids',
    'how to split chores between siblings',
    'fair chores for siblings',
    'chore wheel app',
    'bonus chores for kids',
    'up for grabs chores',
    'chore app for multiple kids',
  ],
  openGraph: {
    type: 'article',
    publishedTime: '2026-10-10',
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
  datePublished: '2026-10-10',
  dateModified: '2026-10-10',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How often should chores rotate between siblings?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Weekly works for most families: long enough for a kid to get good at a job, short enough that nobody is stuck with the worst one. Daily rotation is hard to keep track of without a tool doing it for you.',
      },
    },
    {
      '@type': 'Question',
      name: 'Should older kids get harder chores?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes for skill, no for unpleasantness. Give older kids the jobs that need more skill, and rotate the jobs everyone dislikes, like trash or dishes, between every kid who can do them.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is an up-for-grabs or bonus chore?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'An extra job offered to every kid at once. Whoever finishes it first earns the reward. It turns optional work into a small race and rewards initiative without anyone being assigned it.',
      },
    },
  ],
}

export default function SplitChoresFairlyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Parenting</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">October 10, 2026</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">6 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              &ldquo;Why do I always have to take out the trash?&rdquo; If you have more than one
              kid, you have heard it. Fairness is the fight underneath most chore fights, and
              it has three fixes that work. Here they are, and how ChoreStar now does the
              bookkeeping for you.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Rotate the Jobs Nobody Wants</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Some chores are just worse than others. Dishes, trash, scooping the litter box.
              Assigning them permanently to one kid feels like a punishment, and splitting
              them by the day turns into a negotiation. A weekly rotation fixes both:
              this week dishes are Maya&apos;s, next week they&apos;re Leo&apos;s, and
              everyone can see whose turn is coming.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Weekly is the sweet spot. Long enough for a kid to get good at the job, short
              enough that nobody is stuck with it. The hard part has always been remembering
              whose week it is, which is exactly the part a parent should not have to do.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Post Bonus Jobs for Whoever Is Fastest</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Not every job needs an owner. Washing the car, sweeping the garage, or helping
              with groceries can be offered to everyone at once: first kid to finish earns
              the reward. Parents sometimes call these &ldquo;up for grabs&rdquo; chores.
              They reward initiative instead of assigning more work, and a little sibling
              race gets the job done before lunch.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Keep bonus jobs genuinely extra. If the everyday chores become a race, the
              youngest kid never wins and stops trying.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. Let Each Kid Save for Their Own Thing</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Fair does not mean identical. Two kids doing the same chores will want
              completely different things for it, and that is the point. When each kid has
              their own savings goal, a visible bar filling toward a Lego set or a scooter,
              the question stops being &ldquo;did she do less than me?&rdquo; and becomes
              &ldquo;how close am I?&rdquo;
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              One more rule of thumb: match difficulty to age, and rotate unpleasantness.
              Your eleven-year-old can mow and your six-year-old can match socks, but the
              trash goes round to everyone who can carry the bag.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How ChoreStar Does It Now</h2>
            <p className="text-gray-700 dark:text-gray-300">
              This week&apos;s update builds all three into ChoreStar Premium:
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>Chores that take turns.</strong> Add a chore, pick <em>Take turns
                weekly</em>, and choose which kids share it. It moves to the next kid every
                Sunday on its own, and each kid keeps what they earned on their turn.
              </li>
              <li>
                <strong>Bonus chores.</strong> Pick <em>Bonus: first to finish earns it</em>.
                Every kid you choose sees it; the first one to check it off that day gets
                the reward, and nobody else can claim it until tomorrow.
              </li>
              <li>
                <strong>More than one savings goal.</strong> Kids can save for several
                things at once, each with its own progress bar.
              </li>
              <li>
                <strong>10 more routine templates</strong>, from School Morning Express to
                Weekend Room Reset, so a new routine takes one tap.
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Shared chores are set up from the web dashboard today, and show up for the
              right kid on iPhone, iPad and Android right away. Premium is $4.99 a month or
              $49.99 a year, and the free plan (3 kids, 20 chores, routines, a savings goal
              and a starter reward store) stays free.
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">How often should chores rotate?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Weekly for most families. Daily rotation is fair in theory and impossible to
              track by hand.
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Should older kids get harder chores?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Harder in skill, yes. Worse in unpleasantness, no: rotate those.
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">What if one kid always grabs the bonus jobs?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              That kid is showing initiative, which is what bonus jobs reward. If a younger
              sibling feels shut out, give them a bonus job only they can do, or set an
              easier one on a day they are home first.
            </p>
          </div>

          <BlogPostExtras slug="split-chores-fairly-between-siblings" />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
