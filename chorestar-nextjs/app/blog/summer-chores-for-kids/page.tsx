import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Summer Chores for Kids: Outdoor Jobs, Pool Prep & Screen-Time Swaps',
  description: 'A practical summer chore list for kids — watering plants, washing the car, BBQ prep, pool cleanup, and daily jobs that keep structure without killing summer fun.',
  keywords: [
    'summer chores for kids',
    'outdoor chores for kids',
    'summer chore chart',
    'kids summer responsibility list',
    'age appropriate summer chores',
    'summer jobs for kids at home',
    'chore list for summer break',
    'kids chores no school',
  ],
  openGraph: {
    title: 'Summer Chores for Kids: Outdoor Jobs, Pool Prep & Screen-Time Swaps',
    description: 'Keep summer fun and productive with age-appropriate outdoor chores kids can actually finish.',
    url: 'https://chorestar.app/blog/summer-chores-for-kids',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Summer Chores for Kids',
    description: 'Outdoor jobs, pool prep, and daily summer chores that give kids structure without killing the fun.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/summer-chores-for-kids',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'Summer Chores for Kids: Outdoor Jobs, Pool Prep & Screen-Time Swaps',
  description: 'A practical summer chore list for kids — watering plants, washing the car, BBQ prep, pool cleanup, and daily jobs that keep structure without killing summer fun.',
  url: 'https://chorestar.app/blog/summer-chores-for-kids',
  datePublished: '2026-06-07',
  dateModified: '2026-06-07',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://chorestar.app/blog/summer-chores-for-kids',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What are good summer chores for kids?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Good summer chores include watering plants, washing the car, sweeping the patio, BBQ prep, picking up outdoor toys, helping with pool cleanup, and light yard work like mowing or weeding for older kids.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many chores should kids do in summer?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most families do well with 2-4 daily chores plus one bigger weekly outdoor job. Summer should still feel like summer — short, concrete tasks beat long chore marathons.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you get kids to do chores during summer break?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Give chores a fixed time slot, keep tasks small and visible, tie rewards to completion, and let kids check off progress themselves. A simple routine or chore tracker helps kids follow through without constant reminders.',
      },
    },
  ],
}

const summerChores = [
  {
    title: 'Daily Helpers',
    age: 'Ages 4-7',
    chores: [
      'Water plants',
      'Pick up outdoor toys',
      'Bring in towels or pool gear',
      'Feed pets',
      'Set the table for lunch',
    ],
  },
  {
    title: 'Outdoor Crew',
    age: 'Ages 7-11',
    chores: [
      'Sweep the patio or deck',
      'Wash the car (with help)',
      'Help with BBQ prep',
      'Weed the garden',
      'Take out trash and recycling',
    ],
  },
  {
    title: 'Big Summer Jobs',
    age: 'Ages 10+',
    chores: [
      'Mow the lawn',
      'Skim the pool',
      'Wash outdoor furniture',
      'Organize the garage',
      'Help with beach or park cleanup',
    ],
  },
]

const screenTimeSwaps = [
  'Do 3 chores, then 30 minutes of screen time',
  'Morning routine first — chores before tablets',
  'Earn a pool trip or ice cream run by finishing the daily list',
  'Weekend bonus: finish all weekly chores for a family movie night',
]

export default function SummerChoresPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Chores</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">June 7, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">7 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Summer Chores for Kids: Outdoor Jobs, Pool Prep & Screen-Time Swaps
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Summer break does not have to mean zero structure — or a daily nagging battle. The trick is picking
              chores that fit the season, keeping them short, and letting kids see their progress.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Why Summer Chores Are Different</h2>
            <p className="text-gray-700 dark:text-gray-300">
              During the school year, chores often happen in the margins — before the bus, after homework, before bed.
              Summer flips the schedule. Kids have more free time, parents are juggling camps and work, and without
              some structure, &ldquo;I&apos;ll do it later&rdquo; stretches until September.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The good news: summer chores can actually be more fun than indoor ones. Washing the car turns into a
              water fight. Watering plants gets kids outside. BBQ prep feels like being part of something social.
              Outdoor jobs have visible results, which matters a lot for kids who need to see that their effort counted.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Summer Chore Ideas by Age</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Aim for 2–4 daily tasks and one bigger weekly job. Keep each task concrete — &ldquo;water the front flower
              pots&rdquo; beats &ldquo;help in the yard.&rdquo;
            </p>

            <div className="grid gap-4 my-8">
              {summerChores.map(({ title, age, chores }) => (
                <div key={title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full px-3 py-1">
                      {age}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chores.map((chore) => (
                      <p key={chore} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="text-amber-500 dark:text-amber-400">✓</span>
                        {chore}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The ChoreStar Summer Suggestions</h2>
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar&apos;s smart suggestion engine boosts summer-friendly chores from June through August — watering
              plants, cleaning the pool, BBQ prep, beach cleanup, mowing the lawn, and washing the car. They are
              age-filtered, so younger kids see simpler outdoor jobs while older kids get the bigger yard work.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              You can add any suggestion with one tap, set a reward amount, and assign it to the right child. The
              Summer theme in Settings → Appearance swaps in sunny accent colors across the dashboard — a small thing,
              but kids notice when the app feels seasonal too.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Screen-Time Swaps That Actually Work</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Summer screen-time battles are real. Instead of arguing every hour, tie device time to completed chores.
              The rule should be simple enough that a kid can explain it back to you:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {screenTimeSwaps.map((swap) => (
                <li key={swap}>{swap}</li>
              ))}
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              The key is consistency. If chores unlock screen time on Monday but not Tuesday, kids stop trusting the
              system. A chore tracker kids can check themselves — even a PIN login they manage on their own phone or
              tablet — cuts down on &ldquo;Did I do enough yet?&rdquo; questions.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Build a Simple Summer Morning Routine</h2>
            <p className="text-gray-700 dark:text-gray-300">
              You do not need a military schedule. A five-step morning routine works for a lot of families:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>Get dressed and brush teeth</li>
              <li>Make bed</li>
              <li>Feed pets or water plants</li>
              <li>One assigned chore from the daily list</li>
              <li>Breakfast — then summer fun unlocks</li>
            </ol>
            <p className="text-gray-700 dark:text-gray-300">
              Kids run through routines one step at a time in ChoreStar&apos;s routine player — with optional timers and a
              confetti celebration when they finish. It turns &ldquo;get your stuff done&rdquo; into something they can actually
              complete without you repeating every step.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How to Keep Summer Chores From Becoming a Fight</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Keep outdoor chores short and specific. Give a time limit (&ldquo;10 minutes of yard pickup&rdquo;) instead of an
              open-ended project. Rotate the boring jobs — nobody wants to take out trash every single day all summer.
              And celebrate completion, even for small wins. A streak, a few points, or a quick &ldquo;you&apos;re done, go
              swim&rdquo; goes further than a lecture about responsibility.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              If you have multiple kids, let them pick from a short list of approved chores. Choice reduces resistance.
              Siblings competing to finish first? That is free motivation — lean into it.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Ready for summer structure?</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                ChoreStar suggests age-appropriate summer chores, tracks rewards, and lets kids log in with a PIN — no
                email required. Free for up to 3 kids and 20 chores. Works on any phone or tablet, no download needed.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
              >
                Get Started Free →
              </Link>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
