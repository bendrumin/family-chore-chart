import Link from 'next/link'
import { PublicPageShell } from '@/components/layout/public-page-shell'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { BlogPostExtras } from '@/components/blog/blog-post-extras'
import { AppStoreBadge } from '@/components/home/app-store-badge'
import type { Metadata } from 'next'

const TITLE = 'Why Kids Quit Their Chore Chart After a Month, and How to Keep Them Going'
const DESCRIPTION =
  'Most chore charts work for four to eight weeks, then quietly die. Here is why the novelty wears off, five things that keep kids going past it, and the growing pet ChoreStar added for exactly that.'
const URL = 'https://chorestar.app/blog/keep-kids-motivated-chores-after-novelty'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'kids lose interest in chore chart',
    'how to keep kids motivated to do chores',
    'chore chart stopped working',
    'chore app with virtual pet',
    'gamify chores for kids',
    'chore motivation ideas',
    'kids chore streaks',
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
      name: 'Why do kids lose interest in chore charts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The first weeks run on novelty: new stickers, a new app, a new rule. Once that wears off, usually after four to eight weeks, a chart that only records what got done gives a kid nothing new to look forward to.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do virtual pets really help kids do chores?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'They help when the pet grows from real progress and changes slowly over months, so there is always a next stage to reach. They backfire when the pet gets sick or dies from a missed day, which turns a reward into guilt.',
      },
    },
    {
      '@type': 'Question',
      name: 'What should I do when my kid has a bad week?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nothing dramatic. Restart the streak without a speech, keep the long-term progress they already made, and make the next small win easy. Progress that can be lost in a day teaches kids to stop trying.',
      },
    },
  ],
}

export default function KeepKidsMotivatedPage() {
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
              Week one, your kid checks off chores before you ask. Week three, with a reminder.
              Week six, the chart is behind the cereal box. It isn&apos;t laziness and it isn&apos;t
              you. Almost every chore system runs on novelty, and novelty has a shelf life of four
              to eight weeks. The trick is to build in things that are still new in month three.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">1. Give Progress Somewhere to Go</h2>
            <p className="text-gray-700 dark:text-gray-300">
              A checkmark records a chore. It doesn&apos;t build toward anything. Kids keep going
              when today&apos;s work visibly adds to something bigger: a savings goal filling up, a
              level going up, a thing that grows. The bigger thing should change slowly, over weeks
              and months, so there is always a next milestone in sight.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">2. Never Take Progress Away</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Streaks are great until they break. If one missed Tuesday wipes out a month of work,
              a kid learns that the system punishes them, and quits. Let streaks reset, but keep
              the long-term progress they earned. A virtual pet that gets sick or runs away when a
              chore is missed is the extreme version of this, and it turns a reward into guilt.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3. Add Something New on a Schedule</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Novelty wears off, so add more of it on purpose. A new reward in the store each month,
              a seasonal goal, a fresh routine for the new school term. Small and predictable beats
              big and rare: &ldquo;there&apos;s always something new on the first of the month&rdquo;
              gives a kid a reason to check in.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">4. Let Them Own Something</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Kids work harder for things they chose. Let them pick the goal they save for, the
              order of their morning routine, the name of the thing that grows. Ownership is what
              turns your system into theirs.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">5. Team Up Sometimes</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Siblings competing burns out fast and someone always loses. Siblings working toward
              one shared reward (fifty chores this week for pizza night) brings back the energy of
              week one without a scoreboard.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What ChoreStar Does Now: Star Pets</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We built all five of those into one thing. Each kid adopts a Star Pet on their own
              kid login, picks from six (a pup, a kitty, a bunny, a dino, a panda or an owl) and
              names it.
            </p>
            <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>
                <strong>It grows from what they already do.</strong> Approved chores, finished
                routines, perfect days, week-long streaks and family challenge wins all earn XP. The
                pet goes from baby to kid to teen to grown-up over a few months, and kids who keep a
                30-day streak unlock a rare star form.
              </li>
              <li>
                <strong>It never gets sad.</strong> When nothing is done yet it&apos;s a little
                hungry or sleepy, and happy once today is done. It never gets sick, never runs away
                and never loses a level.
              </li>
              <li>
                <strong>Something new every month.</strong> Hats, extras and places unlock as the
                pet levels up, and every month brings a seasonal item to collect (a witch hat in
                October, a Santa hat in December) after about five chores.
              </li>
              <li>
                <strong>You stay in charge.</strong> You see every kid&apos;s pet and mood on your
                dashboard and can switch pets off for any kid in Settings.
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300">
              Every family gets a starter pup that grows to the kid stage for free. Premium unlocks
              all six pets, the teen, grown-up and star stages, the outfits and the monthly drops.
              It&apos;s $4.99 a month or $49.99 a year, and a year of Premium covers all twelve
              monthly drops.
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
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">How long does a chore chart usually last?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Four to eight weeks before the novelty is gone. What happens after that depends on
              whether there is still something to work toward.
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Is a virtual pet just another screen?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              It lives on the same screen as the chore list, and the only way to grow it is to go
              do the real chore. There is nothing to tap that earns XP by itself.
            </p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">What if my kid has a bad week?</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Let it go. The streak restarts, the pet keeps every level it earned, and the next
              small win is one chore away.
            </p>
          </div>

          <BlogPostExtras slug="keep-kids-motivated-chores-after-novelty" />
        </article>
      </main>

      <SiteFooter />
    </PublicPageShell>
  )
}
