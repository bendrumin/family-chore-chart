import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Age-Appropriate Chores: What Kids Can Handle at Every Age',
  description: 'A practical guide to matching chores with your child\'s age — from simple self-care at 3 to full household responsibilities at 15, with 85+ real chore ideas organized by category.',
  keywords: [
    'age appropriate chores',
    'chores for 5 year olds',
    'chores for 10 year olds',
    'chore list by age',
    'what chores can kids do',
    'kids chore ideas',
    'chores for toddlers',
    'chores for teenagers',
  ],
  openGraph: {
    title: 'Age-Appropriate Chores: What Kids Can Handle at Every Age',
    description: 'A practical guide to matching chores with your child\'s age — 85+ chore ideas organized by category.',
    url: 'https://chorestar.app/blog/age-appropriate-chores-by-age',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Age-Appropriate Chores: What Kids Can Handle at Every Age',
    description: '85+ chore ideas organized by age and category for kids 3-18.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/age-appropriate-chores-by-age',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Age-Appropriate Chores: What Kids Can Handle at Every Age',
  description: 'A practical guide to matching chores with your child\'s age — from simple self-care at 3 to full household responsibilities at 15.',
  url: 'https://chorestar.app/blog/age-appropriate-chores-by-age',
  datePublished: '2026-03-28',
  dateModified: '2026-03-28',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

const choresByAge = [
  {
    range: 'Ages 3-4',
    label: 'The Helpers',
    color: '#8b5cf6',
    chores: [
      '🪥 Brush teeth (with help)',
      '🛏️ Make bed (pull up covers)',
      '👕 Get dressed (with clothes laid out)',
      '👖 Put pajamas on',
      '🧼 Wash hands',
      '🧸 Put toys away',
      '👚 Pick up clothes off floor',
      '🐾 Fill pet water bowl',
    ],
    tip: 'At this age, focus on self-care and simple tidying. Kids are building habits, not doing heavy lifting. The Flat Daily Rate reward mode works best here — participation is what matters.',
  },
  {
    range: 'Ages 5-7',
    label: 'The Learners',
    color: '#3b82f6',
    chores: [
      '🪥 Brush teeth & comb hair independently',
      '🛏️ Make bed fully',
      '🎒 Pack school bag',
      '🍽️ Set the table',
      '🍽️ Clear the table',
      '🧺 Put dirty clothes in hamper',
      '🐾 Feed the pet',
      '📖 Read for 20 minutes',
      '🌿 Water plants (spring through fall)',
      '📦 Help sort laundry',
    ],
    tip: 'Kids this age can handle multi-step tasks and kitchen responsibilities. ChoreStar\'s chore suggestion engine starts recommending kitchen chores (set the table, clear the table) at age 4+.',
  },
  {
    range: 'Ages 8-10',
    label: 'The Independents',
    color: '#10b981',
    chores: [
      '🍽️ Help load dishwasher',
      '🍽️ Unload dishwasher',
      '🧹 Sweep the floor',
      '🧺 Fold laundry',
      '🧺 Put away clean clothes',
      '🍳 Help with cooking (supervised)',
      '🥪 Pack own lunch',
      '🌿 Help in the garden (spring through fall)',
      '🍂 Rake leaves (fall)',
      '♻️ Take out recycling',
      '📖 Do homework independently',
    ],
    tip: 'This is the sweet spot for switching to Per-Chore rewards. Kids understand that loading the dishwasher (25¢) is harder than making their bed (5¢). The reward amounts in ChoreStar range from 3¢ to 50¢.',
  },
  {
    range: 'Ages 11-14',
    label: 'The Contributors',
    color: '#f59e0b',
    chores: [
      '🧹 Vacuum a room',
      '🧹 Dust furniture',
      '🚿 Clean bathroom sink',
      '🪞 Wipe down mirrors',
      '🗑️ Take out trash cans',
      '🍳 Help with cooking (less supervision)',
      '🧺 Sort and start laundry',
      '🏠 Organize bookshelf / desk',
      '❄️ Shovel snow (winter)',
      '📧 Bring in mail',
      '📱 Screen-free hour',
    ],
    tip: 'Tweens can handle real household chores and should be building toward independence. ChoreStar\'s "Household" category (vacuum, sweep, dust, clean bathroom sink) starts at age 7.',
  },
  {
    range: 'Ages 15-18',
    label: 'The Adults-in-Training',
    color: '#ef4444',
    chores: [
      'All of the above, plus:',
      '🍳 Cook simple meals independently',
      '🧺 Full laundry cycle (wash, dry, fold, put away)',
      '🧹 Deep clean bathroom',
      '🚗 Wash the car',
      '🛒 Help with grocery shopping',
      '🌿 Full yard maintenance',
      '🎸 Practice instrument',
      '📖 Independent study time',
    ],
    tip: 'Teenagers should be handling chores they\'ll need as adults. The Full Week Bonus works well here — "stay up late" or "use the car" as a reward for a perfect week is more motivating than small cash amounts.',
  },
]

export default function AgeAppropriateChoresPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Chores</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">March 28, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">8 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              Age-Appropriate Chores: What Kids Can Handle at Every Age
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Not sure what to assign your 5-year-old vs your 12-year-old? Here&apos;s a practical breakdown based on
              the 85+ chore suggestions built into ChoreStar, organized by age and category.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Golden Rule: Start Simple, Add Gradually</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The biggest mistake parents make is assigning too many chores too fast. A 4-year-old who&apos;s never done
              chores shouldn&apos;t start with 10 tasks — they should start with 2-3, get comfortable, and build from
              there. ChoreStar&apos;s suggestion engine follows this principle: it filters chores by your child&apos;s age,
              avoids duplicates of chores you&apos;ve already assigned, and if your child has a completion rate above
              75%, it starts suggesting slightly harder tasks.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chores by Age Group</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Every chore below comes directly from ChoreStar&apos;s built-in suggestion engine, which organizes 85+
              chores across 8 categories: Self-Care, Tidying, Kitchen, Laundry, Pets, Outdoor, Household, and Learning.
              Each chore has an age range, a category, and a suggested reward amount.
            </p>

            <div className="space-y-6 my-8">
              {choresByAge.map(({ range, label, color, chores, tip }) => (
                <div key={range} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: `3px solid ${color}` }}>
                    <span className="font-bold text-gray-900 dark:text-white">{range}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">— {label}</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                      {chores.map((chore) => (
                        <p key={chore} className="text-sm text-gray-700 dark:text-gray-300">{chore}</p>
                      ))}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-semibold">Tip:</span> {tip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Seasonal Chores</h2>
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar&apos;s suggestion engine also accounts for the time of year. It won&apos;t suggest &ldquo;rake leaves&rdquo;
              in April or &ldquo;water plants&rdquo; in December. Here&apos;s how seasonal chores break down: spring (March–May)
              brings garden and planting chores; summer (June–August) adds watering plants and more outdoor
              activities; fall (September–November) focuses on leaf raking and yard work; and winter
              (December–February) introduces snow shoveling and more indoor tasks.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              School-related chores like &ldquo;do homework&rdquo; and &ldquo;pack school bag&rdquo; are suggested during the school
              year (September through May) and automatically deprioritized during summer months.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The 8 Chore Categories</h2>
            <p className="text-gray-700 dark:text-gray-300">
              A well-rounded chore list shouldn&apos;t be all cleaning. ChoreStar organizes chores into 8 categories,
              and the suggestion engine deliberately diversifies across them: Self-Care (🪥) for hygiene and
              personal tasks, Tidying (🧹) for bedroom and play area cleanup, Kitchen (🍽️) for meal-related
              tasks, Laundry (🧺) for clothes management, Pets (🐾) for animal care, Outdoor (🌿) for yard and
              garden work, Household (🏠) for deeper cleaning, and Learning (📖) for educational activities
              like reading and homework.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              There are also achievement badges tied to these categories — &ldquo;Family Helper&rdquo; (🏠) for 50 household
              chores, &ldquo;Little Scholar&rdquo; (📚) for 25 learning activities, &ldquo;Creative Artist&rdquo; (🎨) for 20
              creative activities, and &ldquo;Young Athlete&rdquo; (🏃) for 30 physical activities. Diversifying chores
              across categories gives kids more badges to work toward.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How ChoreStar Suggests Chores</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Instead of staring at a blank page trying to think of chores, ChoreStar&apos;s Smart Suggestions feature
              does the work for you. It generates 5 age-appropriate, seasonal chore ideas tailored to each child —
              one tap to add them. The algorithm filters by your child&apos;s age, removes chores your family already
              has, boosts seasonal chores based on the current month, diversifies across categories, and even adjusts
              difficulty based on your child&apos;s completion rate. If they&apos;re completing more than 75% of their chores
              consistently, it suggests slightly harder tasks with higher rewards.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Let ChoreStar suggest chores for your kids</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                Add your children with their ages and ChoreStar will automatically suggest age-appropriate chores.
                Free for up to 3 kids and 20 chores — no credit card required.
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
