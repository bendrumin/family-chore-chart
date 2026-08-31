'use client'

import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT, ACCENT_SURFACE_STYLE, ACCENT_SURFACE } from '@/lib/constants/brand'
import {
  UserPlus, Shuffle, Palette, Sun, ListChecks, PenLine,
  PlusCircle, Key, Link2, Smartphone, Play, CheckCircle2,
  PartyPopper, Settings, Copy, Edit3,
  Wallet, Banknote, HandCoins, Target, Gift, Camera, CalendarDays,
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
      { text: 'Hit Randomize to generate a random robot avatar. Keep hitting it until something clicks!', icon: <Shuffle className="w-4 h-4" /> },
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
      { text: "Tap Create Routine. It's now ready to assign to your kids.", icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
    tip: 'Bedtime works exactly the same way. Just choose the Bedtime Routine template instead.',
  },
  {
    emoji: '🔑',
    title: 'Kid Login Setup',
    slug: 'kid-login',
    accent: '#3b82f6',
    intro:
      "ChoreStar's Kid Zone lets kids access their routines independently, no email or password needed.",
    steps: [
      { text: 'Tap the Settings gear icon, then go to the Family tab.', icon: <Settings className="w-4 h-4" /> },
      { text: 'Copy your Kid Login Link. This is the unique URL for your family.', icon: <Copy className="w-4 h-4" /> },
      { text: 'Open the editor and set a 4-digit PIN for each child.', icon: <Key className="w-4 h-4" /> },
      { text: 'Share the link with your kid: bookmark it on the family tablet, text it to their phone, or make it a home screen shortcut.', icon: <Smartphone className="w-4 h-4" /> },
      { text: 'When they visit the link and enter their PIN, they land directly in their ChoreStar.', icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
    tip: "Kids see only their own routines. No confusing menus, no sibling mix-ups.",
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
      { text: 'Tapping Start begins the routine, one step shown at a time.', icon: <ListChecks className="w-4 h-4" /> },
      { text: 'Each step shows clearly on screen; when done, they tap to move to the next.', icon: <CheckCircle2 className="w-4 h-4" /> },
      { text: 'After the last step, confetti! A celebration screen rewards the effort.', icon: <PartyPopper className="w-4 h-4" /> },
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
    tip: "Every child gets their own unique PIN. This is how ChoreStar tells kids apart at login.",
  },
  {
    emoji: '💰',
    title: 'Seeing & Paying Out Allowance',
    slug: 'allowance-payout',
    accent: '#f97316',
    intro:
      "ChoreStar keeps a running balance for every child: everything they have ever earned, minus everything you have already handed over. Here is where to find it and how to settle up.",
    steps: [
      { text: "Open your dashboard and scroll to a child's weekly stats.", icon: <Wallet className="w-4 h-4" /> },
      { text: 'The balance tile shows what they have earned, what you have paid, and what is still owed.', icon: <Banknote className="w-4 h-4" /> },
      { text: 'That number never resets with the week. Unpaid allowance stays visible until you pay it.', icon: <CheckCircle2 className="w-4 h-4" /> },
      { text: 'When you hand over real money, tap Pay out to clear the balance.', icon: <HandCoins className="w-4 h-4" /> },
      { text: 'If they are saving for a goal, Pay out the goal sends the money there instead.', icon: <Target className="w-4 h-4" /> },
    ],
    tip: 'On iOS the same balance shows on each child\'s card in the Family tab, under their chip on Home, and on their detail page next to the Pay out button.',
  },
  {
    emoji: '🎯',
    title: "Kids' Goals & the Reward Store",
    slug: 'goals-store',
    accent: '#06b6d4',
    intro:
      'New in 2.0: allowance finally has somewhere to go. Kids save toward a goal they picked, or spend in a store you stocked with things money cannot buy.',
    steps: [
      { text: 'Open Settings, then the Rewards tab, to stock your Reward Store.', icon: <Settings className="w-4 h-4" /> },
      { text: 'Add items like 30 minutes of screen time or picking the family movie, and set your own prices.', icon: <Gift className="w-4 h-4" /> },
      { text: 'In kid mode, your child picks a goal and watches the bar fill as unspent allowance grows.', icon: <Target className="w-4 h-4" /> },
      { text: 'When a kid taps Get it! on a store item, the request lands in Needs your OK on your dashboard.', icon: <ListChecks className="w-4 h-4" /> },
      { text: 'Approve it and the price comes off their balance automatically.', icon: <CheckCircle2 className="w-4 h-4" /> },
    ],
    tip: 'Starter store items are one tap to add, and every title and price stays editable. The free plan includes one goal per child and a small store.',
  },
  {
    emoji: '✅',
    title: 'Approve Chores First',
    slug: 'approval-mode',
    accent: '#14b8a6',
    intro:
      'Want a look before a tick counts? Approval mode holds kid check-offs for your OK. It is optional and off by default.',
    steps: [
      { text: 'Open Settings, then the Rewards tab, and turn on Approve Chores First.', icon: <Settings className="w-4 h-4" /> },
      { text: 'Kid check-offs now land as pending instead of counting right away.', icon: <ListChecks className="w-4 h-4" /> },
      { text: 'Pending ticks appear in Needs your OK at the top of your dashboard.', icon: <PlusCircle className="w-4 h-4" /> },
      { text: 'Approve to count it toward money, streaks, and badges, or send it back to try again.', icon: <CheckCircle2 className="w-4 h-4" /> },
      { text: 'Want proof? Mark any chore as Ask for a photo, and the picture arrives with the tick.', icon: <Camera className="w-4 h-4" /> },
    ],
    tip: 'Photo chores always go through review, even when the approval toggle is off, because a photo is meant to be looked at.',
  },
  {
    emoji: '📅',
    title: 'Chores on Their Own Days',
    slug: 'chore-days',
    accent: '#6366f1',
    intro:
      'Trash goes out on Tuesday, piano is Monday and Wednesday. Chores can now live on a schedule instead of nagging every day.',
    steps: [
      { text: 'Add a chore, or edit one, and find the Days section.', icon: <PenLine className="w-4 h-4" /> },
      { text: 'Pick the days it is due. Leave all seven selected for everyday chores.', icon: <CalendarDays className="w-4 h-4" /> },
      { text: "Kids only see what is due today, so today's list stays honest.", icon: <ListChecks className="w-4 h-4" /> },
      { text: 'The week grid and widgets follow the schedule too.', icon: <CheckCircle2 className="w-4 h-4" /> },
      { text: 'A day with nothing due never breaks a streak or a perfect week.', icon: <PartyPopper className="w-4 h-4" /> },
    ],
    tip: 'Existing chores keep working exactly as before: a chore with no schedule is simply due every day.',
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
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{tutorial.steps.length} steps</span>
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
        <div className="mt-12 rounded-2xl shadow-2xl p-10 text-center text-white" style={ACCENT_SURFACE_STYLE}>
          <h3 className="text-2xl font-bold mb-3">
            Ready to Get Started?
          </h3>
          <p className="text-lg mb-6">
            Free to try, no credit card needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-white dark:bg-gray-800 rounded-xl font-bold text-base hover:scale-105 transition-all shadow-lg hover:shadow-xl text-indigo-600 dark:text-indigo-400"
            >
              Start Free Today →
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-indigo-700 border-2 border-white rounded-xl font-semibold text-base hover:bg-indigo-50 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-xs">
            ✓ Free plan available  •  ✓ No credit card to start  •  ✓ 117+ happy users
          </p>
        </div>

        <SiteFooter />
      </div>
    </div>
  )
}
