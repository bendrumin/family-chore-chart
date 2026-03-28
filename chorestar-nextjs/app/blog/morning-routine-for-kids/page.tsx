import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT_TEXT } from '@/lib/constants/brand'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Build a Morning Routine for Kids That Actually Sticks',
  description: 'A step-by-step guide to creating morning routines kids follow independently — with timers, progress tracking, and celebrations built in.',
  keywords: [
    'morning routine for kids',
    'kids morning checklist',
    'morning routine chart',
    'how to get kids ready in the morning',
    'morning routine app for kids',
    'children morning schedule',
  ],
  openGraph: {
    title: 'How to Build a Morning Routine for Kids That Actually Sticks',
    description: 'A step-by-step guide to creating morning routines kids follow independently.',
    url: 'https://chorestar.app/blog/morning-routine-for-kids',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Build a Morning Routine for Kids That Actually Sticks',
    description: 'A step-by-step guide to creating morning routines kids follow independently.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/morning-routine-for-kids',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Build a Morning Routine for Kids That Actually Sticks',
  description: 'A step-by-step guide to creating morning routines kids follow independently — with timers, progress tracking, and celebrations built in.',
  url: 'https://chorestar.app/blog/morning-routine-for-kids',
  datePublished: '2026-03-28',
  dateModified: '2026-03-28',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

export default function MorningRoutinePage() {
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
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Routines</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">March 28, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">6 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              How to Build a Morning Routine for Kids That Actually Sticks
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              If mornings in your house feel like herding cats, you&apos;re not alone. Here&apos;s how to build a routine your kids will actually follow — on their own.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Morning Problem Every Parent Knows</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Parents spend an average of 20+ minutes a day nagging kids about tasks. Mornings are the worst — there&apos;s a
              hard deadline (school), multiple steps to get through, and kids who&apos;d rather do literally anything else. The
              result is constant reminders: &ldquo;Did you brush your teeth? Where are your shoes? Have you packed your backpack?&rdquo;
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The fix isn&apos;t more nagging — it&apos;s giving kids a system they can follow independently. A routine that breaks
              the morning into clear, ordered steps so they always know what comes next.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What a Good Morning Routine Looks Like</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We&apos;ve found that the most effective morning routines for kids have 6-8 steps, each with a realistic time
              estimate. Here&apos;s the morning routine template that families on ChoreStar use most:
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden my-6">
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span className="text-xl">🌅</span>
                <span className="font-bold text-gray-900 dark:text-white">Morning Routine</span>
                <span className="ml-auto text-xs text-gray-400">8 steps</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { icon: '⏰', step: 'Wake Up', time: '1 min' },
                  { icon: '🛏️', step: 'Make Bed', time: '2 min' },
                  { icon: '🪥', step: 'Brush Teeth', time: '2 min' },
                  { icon: '🧼', step: 'Wash Face', time: '1 min' },
                  { icon: '👕', step: 'Get Dressed', time: '3 min' },
                  { icon: '🥣', step: 'Eat Breakfast', time: '10 min' },
                  { icon: '🎒', step: 'Pack Backpack', time: '2 min' },
                  { icon: '👟', step: 'Put On Shoes', time: '1 min' },
                ].map(({ icon, step, time }) => (
                  <div key={step} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{step}</span>
                    <span className="text-xs text-gray-400">{time}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400">
                Total estimated time: ~22 minutes
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300">
              The order matters. Hygiene first (while they&apos;re still in the bathroom), then getting dressed, then
              breakfast, then the grab-and-go tasks. Each step is small enough that a 5-year-old can handle it alone.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Why One Step at a Time Works</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Handing a kid a list of 8 things is overwhelming. But showing them one step at a time — with a big,
              friendly &ldquo;Done!&rdquo; button — turns it into something manageable. They see what they need to do right now,
              they do it, they tap, and the next step appears. There&apos;s a progress bar at the top so they can see how
              close they are to finishing.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              This is exactly how ChoreStar&apos;s routine player works. Kids step through each task one at a time. Optional
              per-step timers count down to keep things moving — two minutes for teeth brushing, three minutes for getting
              dressed. When the last step is done, they get a confetti celebration and points earned.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timers Keep Kids on Track</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The biggest morning time sink is usually breakfast (10 minutes can easily become 25) and getting dressed
              (which can become a negotiation about outfit choices). Per-step timers create gentle guardrails
              without you having to stand there with a stopwatch.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              In ChoreStar, each routine step can optionally have a countdown timer. When it runs out, the step doesn&apos;t
              auto-advance — it just nudges kids to wrap up. The parent sets the durations when building the routine, so
              you can adjust them after the first week once you see what&apos;s realistic for your family.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Power of the Celebration</h2>
            <p className="text-gray-700 dark:text-gray-300">
              When a kid completes all the steps, they don&apos;t just get a checkmark — they get confetti, a celebration
              screen, and points earned. ChoreStar fires confetti particles from both sides of the screen in the routine&apos;s
              color plus gold, red, green, and purple. The celebration shows how many steps they completed, how long it
              took, and the points they earned.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              As one parent put it: &ldquo;My kids actually check ChoreStar every morning to see what needs to be done. No more
              arguments at bedtime about whether they cleaned their room.&rdquo; That little burst of positive reinforcement
              goes a long way toward building habits that actually stick.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Beyond Morning: Bedtime and After School</h2>
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar supports four routine types: Morning, Bedtime, After School, and Custom. The bedtime template
              includes 7 steps (put away toys, take a bath, brush teeth, put on pajamas, read a bedtime story, hugs &
              kisses, lights out). The after school template covers 5 steps (put away backpack, wash hands, have a snack,
              do homework, play outside).
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Each template is fully customizable — add, remove, rename, or reorder steps to match your family&apos;s actual
              schedule. Drag and drop makes it easy to rearrange.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How to Set It Up in ChoreStar</h2>
            <p className="text-gray-700 dark:text-gray-300">
              From your dashboard, tap the Routines tab, then &ldquo;Add Routine.&rdquo; Select the Morning Routine template.
              Review the pre-loaded steps, adjust anything that doesn&apos;t match your family&apos;s morning, and tap Create
              Routine. It&apos;s now ready for your kids to run — they&apos;ll see it on their dashboard with a big &ldquo;Start&rdquo;
              button when they log in.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Kids log in with your family code and their 4-digit PIN — no email required. The routine resets daily, so
              it&apos;s ready to go every morning without any parent intervention.
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Ready to try it?</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                ChoreStar is free to start — up to 3 kids and 20 chores on the free plan, no credit card required.
                Set up your family&apos;s morning routine in under two minutes.
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
