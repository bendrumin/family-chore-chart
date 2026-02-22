import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT, GRADIENT_TEXT } from '@/lib/constants/brand'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ChoreStar',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: 'https://chorestar.app',
  description: 'Free chore chart app that turns household chores into a game kids love. Track chores, manage allowances, and reward responsibility.',
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      name: 'Free Plan',
      description: 'Up to 3 children, 20 chores, kid login with PIN, achievement badges',
    },
    {
      '@type': 'Offer',
      price: '4.99',
      priceCurrency: 'USD',
      name: 'Premium',
      description: 'Unlimited children and chores, family sharing, premium themes, export reports',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '4.99',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
      },
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '87',
    bestRating: '5',
    worstRating: '1',
  },
  author: {
    '@type': 'Organization',
    name: 'ChoreStar',
    url: 'https://chorestar.app',
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteNav />

      <main id="main-content">
      <div className="container mx-auto px-4 py-16">

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-6xl font-black mb-4">
            <span style={GRADIENT_TEXT}><span style={{ WebkitTextFillColor: 'initial' }}>🌟</span> ChoreStar</span>
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-4">
            Turn Household Chores Into Family Wins
          </p>
          <p className="text-sm font-semibold" style={{ color: '#6366f1' }}>
            ⭐ Join 87+ families already using ChoreStar
          </p>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 mb-16 border border-indigo-100 dark:border-indigo-900">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Stop Nagging. Start Rewarding.<br/>
            <span style={GRADIENT_TEXT}>Finally Get Help Around the House</span>
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
          <div className="rounded-lg p-4 mb-8 border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20">
            <p className="text-center text-sm text-gray-700 dark:text-gray-300">
              🔒 <strong>Start Free</strong> • No Credit Card to Try • Upgrade Anytime
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-xl font-bold text-lg text-white text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              style={{ background: GRADIENT }}
            >
              Start Free Today →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl font-semibold text-lg text-center border-2 transition-all hover:opacity-80"
              style={{ borderColor: '#8b5cf6', color: '#6366f1' }}
            >
              Sign In
            </Link>
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            ✓ Free plan available • ✓ No credit card to start • ✓ Upgrade anytime
          </p>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
            How It Works
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
            Up and running in under 2 minutes
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: '👨‍👩‍👧‍👦',
                title: 'Add Your Family',
                desc: 'Create your account and add each child with their name and avatar. Takes less than 2 minutes.',
              },
              {
                step: '2',
                icon: '📋',
                title: 'Assign Chores',
                desc: 'Build daily and weekly routines for each child. Set a reward amount so kids always know what they\'re earning.',
              },
              {
                step: '3',
                icon: '🏆',
                title: 'Kids Earn & Celebrate',
                desc: 'Kids log in with their PIN, check off chores, and watch their earnings grow. Parents track everything at a glance.',
              },
            ].map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="relative bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg text-center border border-indigo-100 dark:border-indigo-900"
              >
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shadow-md"
                  style={{ background: GRADIENT }}
                >
                  {step}
                </div>
                <div className="text-4xl mb-4 mt-2">{icon}</div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Problem/Solution */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Sound Familiar?
          </h2>
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

        {/* Benefits */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Why Parents Love ChoreStar
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
            Built by a parent, for parents who want less stress and more family harmony
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '⚡', title: 'Set Up in Minutes', desc: 'No complicated setup. Add your kids, assign chores, and you\'re done. Start seeing results today, not next week.' },
              { icon: '🎮', title: 'Kids Actually Use It', desc: 'Colorful, fun interface that feels like a game. Kids love checking off tasks and watching their earnings grow.' },
              { icon: '💰', title: 'Fair Allowance Tracking', desc: 'Automatically calculates earnings. No more "Did I get paid for that?" or manual math at the end of the week.' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Phone, tablet, computer - no app download needed. Everyone in the family stays synced in real-time.' },
              { icon: '👨‍👩‍👧‍👦', title: 'Built for Real Families', desc: 'Multiple kids? Different chores per child? Various reward amounts? We\'ve got you covered.' },
              { icon: '🔒', title: 'Safe & Private', desc: 'Your family data is secure and private. We never share or sell your information. Period.' },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border-t-4"
                style={{ borderTopColor: '#6366f1' }}
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            What Parents Are Saying
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
            Real families, real results
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: '"Game changer! My kids actually check ChoreStar every morning to see what needs to be done. No more arguments at bedtime about whether they cleaned their room."',
                name: 'Sarah M.',
                role: 'Mom of 3',
              },
              {
                quote: '"I was skeptical, but my 7-year-old asks ME if she can do more chores now. The earning tracker makes it feel real to her. Worth every penny."',
                name: 'James T.',
                role: 'Dad of 2',
              },
              {
                quote: '"Finally something that works for our blended family. Everyone knows exactly what\'s expected and the kids actually compete to finish first. Love it!"',
                name: 'Michelle R.',
                role: 'Mom of 4',
              },
            ].map(({ quote, name, role }) => (
              <div key={name} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-indigo-100 dark:border-indigo-900">
                <div className="text-yellow-400 text-lg mb-3">⭐⭐⭐⭐⭐</div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic text-sm leading-relaxed">{quote}</p>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
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
                {[
                  'Up to 3 children',
                  'Up to 20 total chores',
                  'Kid login with PIN',
                  'Points & earnings tracking',
                  'Achievement badges',
                  'Weekly progress reports',
                  'Basic themes',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span className="text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full px-6 py-3 rounded-xl font-semibold text-center text-white transition-all hover:opacity-90 hover:shadow-md"
                style={{ background: GRADIENT }}
              >
                Start Free
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 shadow-2xl border-2 border-indigo-400 relative">
              <div
                className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-white px-4 py-1 rounded-full text-sm font-bold"
                style={{ background: GRADIENT }}
              >
                BEST VALUE
              </div>

              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Premium</h4>
                <div className="text-4xl font-black mb-2" style={GRADIENT_TEXT}>$4.99</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">per month</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or $49.99/year (save 17%)</p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  '<strong>Everything in Free</strong>',
                  '<strong>Unlimited</strong> children',
                  '<strong>Unlimited</strong> chores',
                  'Family sharing (co-parents)',
                  'Premium themes & seasonal looks',
                  'Export reports (PDF/CSV)',
                  'Priority email support',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-xl" style={{ color: '#6366f1' }}>✓</span>
                    <span className="text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: item }} />
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full px-6 py-3 rounded-xl font-bold text-center text-white transition-all hover:opacity-90 shadow-lg hover:shadow-xl"
                style={{ background: GRADIENT }}
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
                  className="px-6 py-2 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ background: GRADIENT }}
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

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
            Everything you need to know before getting started
          </p>
          <div className="space-y-3">
            {[
              {
                q: 'Does my child need their own account or email?',
                a: 'No! Kids log in using a special family link and a simple PIN you set for them. No email address or account needed for kids — they just tap their name and enter their PIN.',
              },
              {
                q: 'What devices does ChoreStar work on?',
                a: 'ChoreStar works in any web browser — phone, tablet, or computer. No app download required. Just bookmark the page and it works like an app on any device.',
              },
              {
                q: 'Can I add chores that repeat daily or weekly?',
                a: 'Yes! You can create routines with daily or weekly chores for each child. Chores reset automatically so you never have to set them up again.',
              },
              {
                q: 'How does the allowance tracking work?',
                a: 'You set a daily reward amount per child. When they complete their chores each day, they earn that amount. The weekly bonus kicks in if they complete all chores every day. ChoreStar tracks it all automatically.',
              },
              {
                q: 'Can two parents manage the same family?',
                a: 'Yes — with a Premium plan, you can invite a co-parent or guardian via email. They\'ll get their own login that shows your family\'s chores and kids.',
              },
              {
                q: 'Can I try Premium before paying?',
                a: 'Absolutely. Sign up for free and you can start a trial of Premium from your dashboard at any time. No credit card required to create your account.',
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-sm overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer font-semibold text-gray-900 dark:text-white list-none hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  {q}
                  <span className="ml-4 text-indigo-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-indigo-50 dark:border-indigo-900 pt-4">
                  {a}
                </div>
              </details>
            ))}
          </div>
          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            More questions?{' '}
            <Link href="/how-to" className="underline hover:text-indigo-600 transition-colors">
              Check out our How-To guides →
            </Link>
          </p>
        </div>

        {/* Final CTA */}
        <div
          className="max-w-4xl mx-auto rounded-2xl shadow-2xl p-12 text-center text-white mb-16"
          style={{ background: GRADIENT }}
        >
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Chore Time?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 87+ families who've said goodbye to chore battles
          </p>
          <Link
            href="/signup"
            className="inline-block px-12 py-5 bg-white rounded-xl font-bold text-xl hover:scale-105 transition-all shadow-lg hover:shadow-xl"
            style={{ color: '#6366f1' }}
          >
            Start Free Today →
          </Link>
          <p className="mt-6 text-sm opacity-75">
            ✓ Set up in 2 minutes  •  ✓ Free plan available  •  ✓ No credit card required
          </p>
        </div>

        <SiteFooter />

      </div>
      </main>
    </div>
  )
}
