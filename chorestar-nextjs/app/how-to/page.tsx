'use client'

import Link from 'next/link'

const GRADIENT = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
const GRADIENT_TEXT = {
  background: GRADIENT,
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
}

const tutorials = [
  {
    emoji: '👧',
    title: 'Adding Your First Child',
    slug: 'add-child',
    gif: '/tutorials/tutorial-add-child.gif',
    intro:
      'Ready to get your family set up? Adding a child to ChoreStar takes less than two minutes, and the fun part is picking their avatar.',
    steps: [
      'From your dashboard, tap Add Child.',
      'Enter your child\'s name and age.',
      'Hit Randomize to generate a random robot avatar — keep hitting it until something clicks!',
      'Tap Add Child to save.',
      'Find your child\'s card and tap Edit to choose a background color or a specific robot style.',
    ],
    tip: 'Every child gets their own avatar, their own PIN, and their own little corner of the app.',
  },
  {
    emoji: '☀️',
    title: 'Creating a Morning Routine',
    slug: 'create-routine',
    gif: '/tutorials/tutorial-create-routine.gif',
    intro:
      'If mornings in your house feel like herding cats, ChoreStar\'s routines are about to become your new best friend.',
    steps: [
      'From your dashboard, tap the Routines tab, then Add Routine.',
      'Select the Morning Routine template.',
      'Review the pre-loaded steps: Wake up, Brush teeth, Get dressed, Make bed, Eat breakfast, Pack backpack.',
      'Add, remove, or rename steps to match your family\'s actual morning.',
      'Tap Create Routine — it\'s now ready to assign to your kids.',
    ],
    tip: 'Bedtime works exactly the same way — just choose the Bedtime Routine template instead.',
  },
  {
    emoji: '🔑',
    title: 'Kid Login Setup',
    slug: 'kid-login',
    gif: '/tutorials/tutorial-kid-login.gif',
    intro:
      'ChoreStar\'s Kid Zone lets kids access their routines independently — no email or password needed.',
    steps: [
      'Tap the Settings gear icon, then go to the Family tab.',
      'Copy your Kid Login Link — this is the unique URL for your family.',
      'Open the editor and set a 4-digit PIN for each child.',
      'Share the link with your kid: bookmark it on the family tablet, text it to their phone, or make it a home screen shortcut.',
      'When they visit the link and enter their PIN, they land directly in their ChoreStar.',
    ],
    tip: 'Kids see only their own routines — no confusing menus, no sibling mix-ups.',
  },
  {
    emoji: '🎉',
    title: 'Running a Routine (Kid\'s Perspective)',
    slug: 'run-routine',
    gif: '/tutorials/tutorial-run-routine.gif',
    intro:
      'Curious what the experience looks like on your child\'s end? Here\'s the full flow from their perspective.',
    steps: [
      'Kid visits the Kid Login Link and enters their 4-digit PIN.',
      'They see their routine cards with a big, friendly Start button.',
      'Tapping Start begins the routine — one step shown at a time.',
      'Each step shows clearly on screen; when done, they tap to move to the next.',
      'After the last step — confetti! A celebration screen rewards the effort.',
    ],
    tip: 'That little burst of positive reinforcement goes a long way toward building habits that actually stick.',
  },
  {
    emoji: '⚙️',
    title: 'Family Settings & the Share Link',
    slug: 'family-settings',
    gif: '/tutorials/tutorial-family-settings.gif',
    intro:
      'The Family Settings section is your command center for keeping everything organized.',
    steps: [
      'Tap the Settings gear icon from anywhere in the app.',
      'Select the Family tab to find your Kid Login Link.',
      'Tap Copy to grab the link anytime you need to re-share it.',
      'Tap Open Editor to manage children\'s profiles and set or update their PINs.',
      'Update a PIN anytime if your child forgets it.',
    ],
    tip: 'Every child gets their own unique PIN — this is how ChoreStar tells kids apart at login.',
  },
]

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">

      {/* Sticky Top Nav */}
      <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link
            href="/"
            className="text-sm font-semibold hover:opacity-80 transition-opacity"
            style={GRADIENT_TEXT}
          >
            ← 🌟 ChoreStar
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
            style={{ background: GRADIENT }}
          >
            Sign In →
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-5xl">

        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            📖 How-To Guides
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Step-by-step walkthroughs to help your family get the most out of ChoreStar — from adding kids to running their first routine.
          </p>
        </header>

        {/* Quick Nav */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-12 border border-indigo-100 dark:border-indigo-900">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Jump to a tutorial</p>
          <div className="flex flex-wrap gap-3">
            {tutorials.map((t) => (
              <a
                key={t.slug}
                href={`#${t.slug}`}
                className="px-4 py-2 bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium hover:bg-indigo-100 dark:hover:bg-gray-600 transition-colors"
              >
                {t.emoji} {t.title}
              </a>
            ))}
          </div>
        </div>

        {/* Tutorial Sections */}
        <div className="space-y-16">
          {tutorials.map((tutorial, index) => (
            <section key={tutorial.slug} id={tutorial.slug}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-indigo-100 dark:border-indigo-900">
                {/* Section Header */}
                <div className="px-8 py-6" style={{ background: GRADIENT }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{tutorial.emoji}</span>
                    <div>
                      <p className="text-indigo-200 text-sm font-medium">Tutorial {index + 1}</p>
                      <h2 className="text-2xl font-bold text-white">{tutorial.title}</h2>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {/* Intro */}
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                    {tutorial.intro}
                  </p>

                  {/* GIF + Steps side by side on larger screens */}
                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* GIF Embed */}
                    <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-video flex items-center justify-center border border-gray-200 dark:border-gray-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tutorial.gif}
                        alt={`${tutorial.title} walkthrough`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `<div class="text-center p-6 text-gray-400 dark:text-gray-500"><div class="text-4xl mb-2">🎬</div><p class="text-sm font-medium">Video coming soon</p><p class="text-xs mt-1 opacity-70">${tutorial.gif.split('/').pop()}</p></div>`
                          }
                        }}
                      />
                    </div>

                    {/* Steps */}
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">Steps</h3>
                      <ol className="space-y-3">
                        {tutorial.steps.map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span
                              className="flex-shrink-0 w-6 h-6 text-white rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
                              style={{ background: GRADIENT }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>

                      {/* Tip */}
                      <div className="mt-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border-l-4 border-indigo-400">
                        <p className="text-sm text-indigo-800 dark:text-indigo-200">
                          <strong>💡 Tip:</strong> {tutorial.tip}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl shadow-2xl p-12 text-center text-white" style={{ background: GRADIENT }}>
          <h3 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Everything above is waiting for you inside ChoreStar — free to try, no credit card needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-10 py-4 bg-white rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-lg hover:shadow-xl"
              style={{ color: '#6366f1' }}
            >
              Start Free Today →
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 bg-white/20 text-white border-2 border-white/40 rounded-xl font-semibold text-lg hover:bg-white/30 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-6 text-sm opacity-75">
            ✓ Free plan available  •  ✓ No credit card to start  •  ✓ 87+ happy families
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 pb-8 text-gray-500 dark:text-gray-400">
          <p className="mb-3 font-semibold text-sm" style={GRADIENT_TEXT}>🌟 ChoreStar</p>
          <p className="text-xs mb-4">Made with ❤️ by a parent who gets it</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-4">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Sign Up Free
            </Link>
          </div>
          <p className="text-xs">🔒 Your privacy matters. We never sell your data.</p>
        </footer>
      </div>
    </div>
  )
}
