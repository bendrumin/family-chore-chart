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
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            🌟 ChoreStar
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-4">
            Turn Household Chores Into Family Wins
          </p>
          {/* Social Proof */}
          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
            ⭐ Join 87+ families already using ChoreStar
          </p>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Stop Nagging. Start Rewarding.<br/>
            <span className="text-blue-600 dark:text-blue-400">Finally Get Help Around the House</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            Tired of reminding your kids to clean their rooms? ChoreStar turns chores into a game that kids actually want to play.
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            ✨ Kids complete chores, earn real rewards, and build lifelong responsibility habits<br/>
            🎯 Parents track progress, manage allowances, and finally get the help they need<br/>
            📱 Works on any device - no app download required
          </p>

          {/* Trust Signals */}
          <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-4 mb-8">
            <p className="text-center text-sm text-gray-700 dark:text-gray-300">
              🔒 <strong>100% Free Forever</strong> • No Credit Card Required • Set Up in 2 Minutes
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors text-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Start Free Today →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            ✓ No credit card • ✓ Cancel anytime • ✓ Privacy protected
          </p>
        </div>

        {/* Problem/Solution */}
        <div className="max-w-4xl mx-auto mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Sound Familiar?
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-50 dark:bg-gray-800 rounded-xl p-6 border-2 border-red-200 dark:border-red-900">
              <h4 className="text-xl font-bold text-red-700 dark:text-red-400 mb-3">😫 Before ChoreStar</h4>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>❌ Constant nagging about chores</li>
                <li>❌ Arguments over allowance</li>
                <li>❌ Kids "forget" their responsibilities</li>
                <li>❌ Paper charts that get lost</li>
                <li>❌ Unclear expectations</li>
              </ul>
            </div>
            <div className="bg-green-50 dark:bg-gray-800 rounded-xl p-6 border-2 border-green-200 dark:border-green-900">
              <h4 className="text-xl font-bold text-green-700 dark:text-green-400 mb-3">🎉 After ChoreStar</h4>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✅ Kids check off chores without reminders</li>
                <li>✅ Fair, automatic allowance tracking</li>
                <li>✅ Visual progress motivates completion</li>
                <li>✅ Always accessible on any device</li>
                <li>✅ Clear expectations = less conflict</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Benefits (Not Features) */}
        <div className="max-w-6xl mx-auto mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Why Parents Love ChoreStar
          </h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
            Built by a parent, for parents who want less stress and more family harmony
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4 border-blue-500">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Set Up in Minutes
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No complicated setup. Add your kids, assign chores, and you're done. Start seeing results today, not next week.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4 border-green-500">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Kids Actually Use It
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Colorful, fun interface that feels like a game. Kids love checking off tasks and watching their earnings grow.
              </p>
              </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4 border-purple-500">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Fair Allowance Tracking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically calculates earnings. No more "Did I get paid for that?" or manual math at the end of the week.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4 border-orange-500">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Works Everywhere
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Phone, tablet, computer - no app download needed. Everyone in the family stays synced in real-time.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4 border-pink-500">
              <div className="text-4xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Built for Real Families
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Multiple kids? Different chores per child? Various reward amounts? We've got you covered.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4 border-red-500">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Safe & Private
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your family data is secure and private. We never share or sell your information. Period.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-5xl">💬</div>
              <div>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4 italic">
                  "Game changer! My kids actually check ChoreStar every morning to see what needs to be done. No more arguments at bedtime about whether they cleaned their room. 10/10 recommend!"
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  - Sarah M., Mom of 3
                </p>
                <div className="text-yellow-400 text-lg">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-12 text-center text-white mb-16">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Transform Chore Time?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join 87+ families who've said goodbye to chore battles
          </p>
          <Link
            href="/signup"
            className="inline-block px-12 py-5 bg-white text-blue-600 rounded-lg font-bold text-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Start Free Now - No Credit Card Required
          </Link>
          <p className="mt-6 text-sm opacity-75">
            ✓ Set up in 2 minutes  •  ✓ Free forever  •  ✓ 87+ happy families
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600 dark:text-gray-400">
          <p className="mb-2">🔒 Your privacy matters. We never sell your data.</p>
          <p className="text-sm">
            Made with ❤️ by a parent who gets it
          </p>
        </footer>
      </div>
    </div>
  )
}
