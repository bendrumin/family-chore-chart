'use client'

import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT } from '@/lib/constants/brand'
import {
  UserPlus, Shuffle, Palette, Sun, ListChecks, PenLine,
  PlusCircle, Key, Link2, Smartphone, Play, CheckCircle2,
  PartyPopper, Settings, Copy, Edit3,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface TutorialStep {
  text: string
  icon: ReactNode
}

interface Tutorial {
  emoji: string
  title: string
  slug: string
  intro: string
  steps: TutorialStep[]
  tip: string
  accent: string
}

const tutorials: Tutorial[] = [
  {
    emoji: '👧',
    title: 'Adding Your First Child',
    slug: 'add-child',
    accent: '#8b5cf6',
    intro:
      'Ready to get your family set up? Adding a child to ChoreStar takes less than two minutes, and the fun part is picking their avatar.',
    steps: [
      { text: 'From your dashboard, tap Add Child.', icon: <UserPlus className="w-4 h-4" /> },
      { text: "Enter your child's name and age.", icon: <PenLine className="w-4 h-4" /> },
      { text: 'Hit Randomize to generate a random robot avatar — keep hitting it until something clicks!', icon: <Shuffle className="w-4 h-4" /> },
      { text: 'Tap Add Child to save.', icon: <PlusCircle className="w-4 h-4" /> },
      { text: "Find your child's card and tap Edit to choose a background color or a specific robot style.", icon: <Palette className="w-4 h-4" /> },
    ],
    tip: 'Every child gets their own avatar, their own PIN, and their own little corner of the app.',
  },
  {
    emoji: '☀️',
    title: 'Creating a Morning Routine',
    slug: 'create-routine',
    accent: '#f59e0b',
    intro:
      "If mornings in your house feel like herding cats, ChoreStar's routines are about to become your new best friend.",
    steps: [
      { text: 'From your dashboard, tap the Routines tab, then Add Routine.', icon: <PlusCircle className="w-4 h-4" /> },
      { text: 'Select the Morning Routine template.', icon: <Sun className="w-4 h-4" /> },
      { text: 'Review the pre-loaded steps: Wake up, Brush teeth, Get dressed, Make bed, Eat breakfast, Pack backpack.', icon: <ListChecks className="w-4 h-4" /> },
      { text: "Add, remove, or rename steps to match your family's actual morning.", icon: <PenLine className="w-4 h-4" /> },
      { text: "Tap Create Routine — it's now ready to assign to your kids.", icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
    tip: 'Bedtime works exactly the same way — just choose the Bedtime Routine template instead.',
  },
  {
    emoji: '🔑',
    title: 'Kid Login Setup',
    slug: 'kid-login',
    accent: '#3b82f6',
    intro:
      "ChoreStar's Kid Zone lets kids access their routines independently — no email or password needed.",
    steps: [
      { text: 'Tap the Settings gear icon, then go to the Family tab.', icon: <Settings className="w-4 h-4" /> },
      { text: 'Copy your Kid Login Link — this is the unique URL for your family.', icon: <Copy className="w-4 h-4" /> },
      { text: 'Open the editor and set a 4-digit PIN for each child.', icon: <Key className="w-4 h-4" /> },
      { text: 'Share the link with your kid: bookmark it on the family tablet, text it to their phone, or make it a home screen shortcut.', icon: <Smartphone className="w-4 h-4" /> },
      { text: 'When they visit the link and enter their PIN, they land directly in their ChoreStar.', icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
    tip: "Kids see only their own routines — no confusing menus, no sibling mix-ups.",
  },
  {
    emoji: '🎉',
    title: "Running a Routine (Kid's Perspective)",
    slug: 'run-routine',
    accent: '#ec4899',
    intro:
      "Curious what the experience looks like on your child's end? Here's the full flow from their perspective.",
    steps: [
      { text: 'Kid visits the Kid Login Link and enters their 4-digit PIN.', icon: <Key className="w-4 h-4" /> },
      { text: 'They see their routine cards with a big, friendly Start button.', icon: <Play className="w-4 h-4" /> },
      { text: 'Tapping Start begins the routine — one step shown at a time.', icon: <ListChecks className="w-4 h-4" /> },
      { text: 'Each step shows clearly on screen; when done, they tap to move to the next.', icon: <CheckCircle2 className="w-4 h-4" /> },
      { text: 'After the last step — confetti! A celebration screen rewards the effort.', icon: <PartyPopper className="w-4 h-4" /> },
    ],
    tip: 'That little burst of positive reinforcement goes a long way toward building habits that actually stick.',
  },
  {
    emoji: '⚙️',
    title: 'Family Settings & the Share Link',
    slug: 'family-settings',
    accent: '#10b981',
    intro:
      'The Family Settings section is your command center for keeping everything organized.',
    steps: [
      { text: 'Tap the Settings gear icon from anywhere in the app.', icon: <Settings className="w-4 h-4" /> },
      { text: 'Select the Family tab to find your Kid Login Link.', icon: <Link2 className="w-4 h-4" /> },
      { text: 'Tap Copy to grab the link anytime you need to re-share it.', icon: <Copy className="w-4 h-4" /> },
      { text: "Tap Open Editor to manage children's profiles and set or update their PINs.", icon: <Edit3 className="w-4 h-4" /> },
      { text: 'Update a PIN anytime if your child forgets it.', icon: <Key className="w-4 h-4" /> },
    ],
    tip: "Every child gets their own unique PIN — this is how ChoreStar tells kids apart at login.",
  },
]

export default function HowToPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">

      <SiteNav />

      <div className="container mx-auto px-4 py-16 max-w-4xl">

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            📖 How-To Guides
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Step-by-step walkthroughs to get the most out of ChoreStar.
          </p>
        </header>

        {/* Quick Nav */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mb-10 border border-indigo-100 dark:border-indigo-900">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Jump to a tutorial</p>
          <div className="flex flex-wrap gap-2">
            {tutorials.map((t) => (
              <a
                key={t.slug}
                href={`#${t.slug}`}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium hover:bg-indigo-100 dark:hover:bg-gray-600 transition-colors"
              >
                {t.emoji} {t.title}
              </a>
            ))}
          </div>
        </div>

        {/* Tutorial Sections */}
        <div className="space-y-8">
          {tutorials.map((tutorial, index) => (
            <section key={tutorial.slug} id={tutorial.slug}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Section Header — compact with accent color strip */}
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: `3px solid ${tutorial.accent}` }}>
                  <span className="text-2xl">{tutorial.emoji}</span>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{tutorial.title}</h2>
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{tutorial.steps.length} steps</span>
                </div>

                <div className="px-5 py-4">
                  {/* Intro */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    {tutorial.intro}
                  </p>

                  {/* Timeline Steps */}
                  <div className="relative ml-3">
                    {/* Vertical timeline line */}
                    <div
                      className="absolute left-[11px] top-3 bottom-3 w-0.5 rounded-full"
                      style={{ backgroundColor: `${tutorial.accent}25` }}
                    />

                    <div className="space-y-0">
                      {tutorial.steps.map((step, i) => (
                        <div key={i} className="relative flex items-start gap-3 py-1.5">
                          {/* Timeline dot */}
                          <div
                            className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: tutorial.accent }}
                          >
                            {step.icon}
                          </div>

                          {/* Step text */}
                          <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5 leading-snug">
                            {step.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <span className="text-sm flex-shrink-0">💡</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {tutorial.tip}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl shadow-2xl p-10 text-center text-white" style={{ background: GRADIENT }}>
          <h3 className="text-2xl font-bold mb-3">
            Ready to Get Started?
          </h3>
          <p className="text-lg mb-6 opacity-90">
            Free to try, no credit card needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-white rounded-xl font-bold text-base hover:scale-105 transition-all shadow-lg hover:shadow-xl"
              style={{ color: '#6366f1' }}
            >
              Start Free Today →
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white/20 text-white border-2 border-white/40 rounded-xl font-semibold text-base hover:bg-white/30 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-xs opacity-75">
            ✓ Free plan available  •  ✓ No credit card to start  •  ✓ 100+ happy families
          </p>
        </div>

        <SiteFooter />
      </div>
    </div>
  )
}
