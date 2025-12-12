import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            🌟 ChoreStar
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300">
            Family Chore Chart & Reward System
          </p>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Track Chores, Earn Rewards, Build Great Habits
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Help your family stay organized and motivated with our easy-to-use chore tracking system.
            Kids complete tasks, earn rewards, and learn responsibility while parents manage everything in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors text-center"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Easy Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Simple 7-day grid to track daily chore completions. Kids can see their progress at a glance.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Reward System
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Set custom reward amounts for each chore. Automatically calculate weekly earnings.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Real-Time Updates
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Instant synchronization across all devices. Everyone stays up-to-date automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600 dark:text-gray-400">
          <p className="mb-2">Built with Next.js 15, Supabase, and Tailwind CSS</p>
          <p className="text-sm">
            Made with ❤️ for families everywhere
          </p>
        </footer>
      </div>
    </div>
  )
}
