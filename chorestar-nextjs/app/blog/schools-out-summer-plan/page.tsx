import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "School's Out — Now What? A Simple Summer Plan for the First Two Weeks",
  description:
    'The bell rang and suddenly there is no schedule. A practical guide for parents: sleep, screens, daily rhythm, boredom, and when to add chores — without overscheduling summer.',
  keywords: [
    'schools out now what',
    'summer schedule for kids',
    'first week of summer break',
    'summer routine for kids',
    'how to structure summer with kids',
    'summer break schedule',
    'kids bored summer break',
    'summer screen time rules',
  ],
  openGraph: {
    title: "School's Out — Now What? A Simple Summer Plan for the First Two Weeks",
    description:
      'Survive the first two weeks of summer break with a light daily rhythm — before you worry about chore charts.',
    url: 'https://chorestar.app/blog/schools-out-summer-plan',
  },
  twitter: {
    card: 'summary_large_image',
    title: "School's Out — Now What?",
    description: 'A simple summer plan for the first two weeks — sleep, screens, rhythm, and when to add chores.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/schools-out-summer-plan',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: "School's Out — Now What? A Simple Summer Plan for the First Two Weeks",
  description:
    'The bell rang and suddenly there is no schedule. A practical guide for parents: sleep, screens, daily rhythm, boredom, and when to add chores.',
  url: 'https://chorestar.app/blog/schools-out-summer-plan',
  datePublished: '2026-06-08',
  dateModified: '2026-06-08',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://chorestar.app/blog/schools-out-summer-plan',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: "School's out — now what do I do with my kids?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Start with basics for week one: keep a loose wake-up time, set one simple daily rhythm (morning, afternoon, evening), and agree on screen-time rules before boredom turns into battles. Add chores in week two once everyone has adjusted.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I structure summer without overscheduling?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Use anchors, not a minute-by-minute calendar: wake up, one morning block, lunch, one afternoon block, dinner, wind-down. Two or three fixed activities per day beat a color-coded camp schedule most families cannot sustain.',
      },
    },
    {
      '@type': 'Question',
      name: 'When should I add chores during summer break?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Wait until week two. Week one is for adjusting sleep and screens. Then add 2–4 short daily tasks plus one weekly job. Link chores to rewards or screen time so kids understand the deal.',
      },
    },
  ],
}

const weekOneAnchors = [
  { time: 'Morning', items: ['Wake up within 1 hour of school-year time', 'Get dressed + brush teeth', 'Breakfast before screens'] },
  { time: 'Afternoon', items: ['One outing OR one at-home project', 'Outside time if possible', 'Quiet hour (books, crafts, not just tablets)'] },
  { time: 'Evening', items: ['Same dinner window as during school', 'Screens off 30–60 min before bed', 'Same bedtime routine — even if bedtime is later'] },
]

const boredomIdeas = [
  'Build a "boredom jar" — write 20 ideas on slips of paper',
  'Rotate who picks lunch and one activity',
  'Library day, park day, pool day — three defaults you can repeat weekly',
  'Let kids plan one "yes day" activity per week',
]

export default function SchoolsOutSummerPlanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/blog" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline mb-6 inline-block">
          ← Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                Parenting
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">June 8, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">6 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              School&apos;s Out — Now What? A Simple Summer Plan for the First Two Weeks
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              The last day of school hits and suddenly nobody knows what day it is. You do not need a Pinterest-perfect
              summer calendar on day one — you need a plan that keeps everyone sane until rhythm kicks in.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Week One: Survive the Transition</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The first week of summer is not for new chore charts and ambitious projects. Kids are tired from the
              school year. Parents are tired too. Your job is to prevent the schedule from dissolving into endless
              screens and snack requests every eleven minutes.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Focus on three things only: <strong>sleep</strong>, <strong>screens</strong>, and <strong>one daily
              anchor</strong>. Everything else can wait until week two.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sleep: loose, not lawless</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Let them sleep in a little — summer should feel different — but keep wake-up within about an hour of the
              school-year norm. Bodies that drift three hours later every day turn into meltdown machines by Thursday.
              Same goes for bedtime: later is fine, chaotic is not.
            </p>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Screens: decide the rule before the fight</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Pick one simple rule and post it where everyone can see it. Examples that work:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside">
              <li>No screens before breakfast and getting dressed</li>
              <li>One hour of outdoor time before tablets</li>
              <li>Devices charge in the kitchen overnight — not in bedrooms</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              You can tie screen time to chores later. Week one is just about stopping the default of waking up and
              grabbing a device.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">A Light Daily Rhythm (Not a Camp Schedule)</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Think anchors, not appointments. Kids feel safer when they know the shape of the day even if the details
              change.
            </p>

            <div className="grid gap-4 my-8">
              {weekOneAnchors.map(({ time, items }) => (
                <div
                  key={time}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{time}</h3>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-indigo-500 dark:text-indigo-400 mt-0.5">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Boredom Is Normal (And Useful)</h2>
            <p className="text-gray-700 dark:text-gray-300">
              &ldquo;I&apos;m bored&rdquo; on day two does not mean you failed. Boredom is where kids learn to entertain
              themselves — if adults do not rush in with a screen every time. A few tricks:
            </p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              {boredomIdeas.map((idea) => (
                <li key={idea}>{idea}</li>
              ))}
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Week Two: Add Structure (Gently)</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Once everyone has adjusted, layer in responsibility. Not a 40-item chore list — start with{' '}
              <strong>2–4 short daily tasks</strong> and one bigger weekly job (yard cleanup, car wash, room reset).
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              This is when a morning or bedtime <strong>routine</strong> helps: five steps kids run on their own —
              brush teeth, make bed, one chore, then summer fun unlocks. Routines beat nagging because the list is the
              boss, not you.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Need chore ideas by age? We put together a{' '}
              <Link href="/blog/summer-chores-for-kids" className="text-indigo-500 dark:text-indigo-400 hover:underline">
                summer chore list
              </Link>{' '}
              with outdoor jobs, screen-time swaps, and age-appropriate tasks. Or see our{' '}
              <Link href="/blog/morning-routine-for-kids" className="text-indigo-500 dark:text-indigo-400 hover:underline">
                morning routine guide
              </Link>{' '}
              for building step-by-step habits that stick.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Not to Do in Week One</h2>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc list-inside">
              <li>Launch a complicated reward system and three new apps</li>
              <li>Compare your summer to other families on social media</li>
              <li>Fill every hour — white space is part of summer</li>
              <li>Abandon all rules because &ldquo;it&apos;s summer&rdquo; — kids need some predictability</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">When ChoreStar Fits In</h2>
            <p className="text-gray-700 dark:text-gray-300">
              You do not need an app on day one. When you are ready for week two, ChoreStar gives you a chore tracker,
              step-by-step routines kids can run themselves, and kid login with a PIN — no email account for the kids.
              They check off tasks, earn rewards, and you stop being the reminder machine.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Free for up to 3 kids and 20 chores. Works in the browser on any phone or tablet — nothing to install.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                Week two ready?
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                Set up a simple morning routine and a short daily chore list in minutes. Kids can log in on their own
                with a family code and PIN.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
                >
                  Get Started Free →
                </Link>
                <Link
                  href="/blog/summer-chores-for-kids"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  Summer chore list →
                </Link>
              </div>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
