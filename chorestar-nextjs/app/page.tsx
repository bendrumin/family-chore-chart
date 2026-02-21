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
      {/* Top Sign In Link - Always visible for returning users */}
      <div className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3 text-right">
          <Link
            href="/login"
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
          >
            Already a member? <span className="underline">Sign In →</span>
          </Link>
        </div>
      </div>

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
            ✨ Kids complete chores, earn rewards, unlock achievements, and build responsibility<br/>
            🎯 Parents track progress, manage allowances, and finally get the help they need<br/>
            📱 Works on any device - no app download required<br/>
            🆓 Start with our free plan - track up to 3 kids and 20 chores
          </p>

          {/* Trust Signals */}
          <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-4 mb-8">
            <p className="text-center text-sm text-gray-700 dark:text-gray-300">
              🔒 <strong>Start Free</strong> • No Credit Card to Try • Upgrade Anytime
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
            ✓ Free plan available • ✓ No credit card to start • ✓ Upgrade anytime
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

        {/* Pricing Comparison */}
        <div className="max-w-6xl mx-auto mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h3>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
            Start free and upgrade anytime. No credit card required to try.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border-2 border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Free Plan</h4>
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">$0</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Forever free</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Up to <strong>3 children</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Up to <strong>20 total chores</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Kid login with PIN</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Points & earnings tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Achievement badges</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Weekly progress reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Basic themes</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="block w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold text-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Start Free
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 shadow-2xl border-2 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                BEST VALUE
              </div>

              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Premium</h4>
                <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">$4.99</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">per month</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or $49.99/year (save 17%)</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300"><strong>Everything in Free</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300"><strong>Unlimited</strong> children</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300"><strong>Unlimited</strong> chores</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Custom chore icons & categories</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Premium themes & customization</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Export reports (PDF/CSV)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">Priority email support</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-center hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Start Free Trial
              </Link>
              <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-3">
                💳 Upgrade to Premium anytime from your dashboard
              </p>
            </div>
          </div>

          {/* Lifetime Option */}
          <div className="mt-8 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-purple-300 dark:border-purple-700 text-center">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div>
                  <span className="text-2xl">🎉</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white ml-2">Lifetime Access</span>
                </div>
                <div className="text-3xl font-black text-purple-600 dark:text-purple-400">$149.99</div>
                <Link
                  href="/signup"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
                >
                  Get Lifetime
                </Link>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                One-time payment • All premium features forever • Best for large families
              </p>
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
            Start Free Today →
          </Link>
          <p className="mt-6 text-sm opacity-75">
            ✓ Set up in 2 minutes  •  ✓ Free plan available  •  ✓ 87+ happy families
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600 dark:text-gray-400">
          <p className="mb-2">🔒 Your privacy matters. We never sell your data.</p>
          <p className="text-sm mb-4">
            Made with ❤️ by a parent who gets it
          </p>
          <p className="text-sm">
            <Link href="/how-to" className="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              📖 How-To Guides
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
