import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Spring Cleaning Chores for Kids: Yard Work, Earth Day Ideas & Cleanup Tasks',
  description: 'A practical spring cleaning chore list for kids, including age-appropriate yard work, dog poop cleanup, litter pickup, gardening, and Earth Day family cleanup ideas.',
  keywords: [
    'spring cleaning chores for kids',
    'yard work chores for kids',
    'earth day chores for kids',
    'kids spring chore list',
    'age appropriate yard work',
    'dog poop cleanup chore',
    'outdoor chores for kids',
    'family spring cleanup',
  ],
  openGraph: {
    title: 'Spring Cleaning Chores for Kids: Yard Work, Earth Day Ideas & Cleanup Tasks',
    description: 'Turn spring cleanup into kid-friendly chores with yard work, litter pickup, gardening, and Earth Day tasks families can actually keep up with.',
    url: 'https://chorestar.app/blog/spring-cleaning-chores-for-kids',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spring Cleaning Chores for Kids',
    description: 'Age-appropriate yard work, Earth Day cleanup ideas, and spring chores kids can help with.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/spring-cleaning-chores-for-kids',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'Spring Cleaning Chores for Kids: Yard Work, Earth Day Ideas & Cleanup Tasks',
  description: 'A practical spring cleaning chore list for kids, including age-appropriate yard work, dog poop cleanup, litter pickup, gardening, and Earth Day family cleanup ideas.',
  url: 'https://chorestar.app/blog/spring-cleaning-chores-for-kids',
  datePublished: '2026-05-02',
  dateModified: '2026-05-02',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://chorestar.app/blog/spring-cleaning-chores-for-kids',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What spring cleaning chores can kids do?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kids can water plants, pick up sticks, pull weeds, plant flowers, sweep patios, wash outdoor toys, refill bird feeders, pick up litter, and help with age-appropriate pet cleanup.',
      },
    },
    {
      '@type': 'Question',
      name: 'What yard work is age appropriate for kids?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Preschoolers can water plants or gather small toys. Elementary-age kids can pick up sticks, pull weeds, sweep porches, and plant flowers. Tweens and teens can handle dog poop cleanup, washing trash bins, and larger yard cleanup tasks.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do you make Earth Day cleanup fun for kids?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Keep the cleanup short, give every child a clear job, use gloves and safe tools, track progress visually, and celebrate when the family finishes. ChoreStar can turn those tasks into repeatable chores with rewards and streaks.',
      },
    },
  ],
}

const springChores = [
  {
    title: 'Quick Wins',
    age: 'Ages 4-7',
    chores: [
      'Water plants',
      'Refill the bird feeder',
      'Pick up outdoor toys',
      'Bring in small garden tools',
      'Wipe down patio chairs',
    ],
  },
  {
    title: 'Yard Helpers',
    age: 'Ages 6-10',
    chores: [
      'Pick up sticks',
      'Pull weeds',
      'Plant flowers',
      'Sweep the porch or patio',
      'Wash outdoor toys',
    ],
  },
  {
    title: 'Big Kid Jobs',
    age: 'Ages 9+',
    chores: [
      'Clean up dog poop',
      'Pick up litter',
      'Take out trash cans',
      'Wash trash bins',
      'Help spread mulch',
    ],
  },
]

const earthDayIdeas = [
  'Walk the block with gloves and pick up litter together',
  'Sort bottles, cans, and cardboard into recycling',
  'Plant flowers for pollinators',
  'Start a small compost bucket for fruit and veggie scraps',
  'Turn off unused lights and make it a daily responsibility',
]

export default function SpringCleaningChoresPage() {
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
              <span className="text-xs text-gray-400 dark:text-gray-500">May 2, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">7 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Spring Cleaning Chores for Kids: Yard Work, Earth Day Ideas & Cleanup Tasks
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Spring is the easiest season to make chores feel useful. The yard needs help, the garage needs a reset,
              Earth Day is fresh in everyone&apos;s mind, and kids can see the difference they made right away.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Why Spring Cleanup Works So Well for Kids</h2>
            <p className="text-gray-700 dark:text-gray-300">
              A lot of indoor chores are invisible by dinner. The counter gets messy again. The laundry basket fills back
              up. Outdoor spring chores are different: a pile of sticks disappears, a flower bed looks brighter, and a
              clean porch actually feels like progress. That immediate before-and-after is motivating for kids.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              It also lets families talk about responsibility in a bigger way. Picking up litter, sorting recycling, and
              helping plants grow connects chores to caring for your home, your neighborhood, and the planet. That is a
              pretty good Earth Day lesson without turning it into homework.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Spring Chore Ideas by Age</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The best spring cleaning chore list is not one giant Saturday project. It is a handful of specific jobs
              kids can finish in 5-20 minutes. Here are good starting points by age:
            </p>

            <div className="grid gap-4 my-8">
              {springChores.map(({ title, age, chores }) => (
                <div key={title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-3 py-1">
                      {age}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chores.map((chore) => (
                      <p key={chore} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="text-emerald-500 dark:text-emerald-400">✓</span>
                        {chore}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The New ChoreStar Spring Cleanup Suggestions</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We added more pre-built spring and Earth Day-friendly chores to ChoreStar&apos;s suggestion engine so families
              do not have to start from a blank page. New suggestions include dog poop cleanup, pick up litter, pull
              weeds, plant flowers, pick up sticks, sweep porch or patio, wash outdoor toys, refill the bird feeder, and
              wash trash bins.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              They are still age-filtered. A 5-year-old might see &ldquo;pick up sticks&rdquo; or &ldquo;refill bird feeder,&rdquo;
              while older kids can get harder jobs like &ldquo;clean up dog poop&rdquo; or &ldquo;wash trash bins.&rdquo; Spring chores
              also get a seasonal boost, so they show up when they are most useful.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Earth Day Chores That Can Become Habits</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Earth Day is a great excuse to do one big cleanup, but the real win is turning a few of those jobs into
              recurring habits. Try these as one-time family activities first, then add the ones that fit your home as
              weekly chores:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {earthDayIdeas.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How to Keep Yard Work From Becoming a Battle</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Keep outdoor chores small and concrete. &ldquo;Clean the yard&rdquo; is too vague. &ldquo;Pick up sticks from the front
              lawn for 10 minutes&rdquo; is something a kid can understand and finish. If the job has any safety concerns,
              like litter cleanup or trash bins, give kids gloves and clear rules about what not to touch.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Rewards help too, especially for jobs that are useful but not glamorous. Dog poop cleanup is never going
              to feel magical, but it is real family work. A clear chore card, a fair reward, and a quick celebration
              after it is done make it easier to repeat next week.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">A Simple Spring Cleanup Routine</h2>
            <p className="text-gray-700 dark:text-gray-300">
              If your family likes routines, create a Saturday Spring Reset with five steps: pick up outdoor toys, gather
              sticks, water plants, sweep the porch, and take out trash or recycling. Kids can run through the routine
              one step at a time, and you can save the bigger jobs for older kids as separate chores.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Ready for spring cleanup?</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                ChoreStar can suggest age-appropriate chores for each child, track completion, and turn outdoor cleanup
                into points, rewards, and streaks. Free for up to 3 kids and 20 chores.
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
