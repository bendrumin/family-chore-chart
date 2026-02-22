import Link from 'next/link'
import type { Metadata } from 'next'
import { PartnerForm } from './partner-form'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT, GRADIENT_TEXT } from '@/lib/constants/brand'

export const metadata: Metadata = {
  title: 'Promote ChoreStar — Partner & Affiliate Program',
  description: 'Partner with ChoreStar to promote the family chore tracking app parents love. Download brand assets, get approved copy, and start earning as an affiliate or agency partner.',
  keywords: [
    'ChoreStar affiliate',
    'ChoreStar partner',
    'family app affiliate program',
    'parenting app promotion',
    'chore app marketing',
    'ChoreStar brand assets',
  ],
  openGraph: {
    title: 'Promote ChoreStar — Partner & Affiliate Program',
    description: 'Partner with ChoreStar to promote the family chore app parents love. Download brand assets, approved copy, and connect with our team.',
    url: 'https://chorestar.app/partners',
  },
  alternates: {
    canonical: 'https://chorestar.app/partners',
  },
}

const BRAND_COLORS = [
  { name: 'Indigo', hex: '#6366f1', usage: 'Primary brand color' },
  { name: 'Purple', hex: '#8b5cf6', usage: 'Gradient end / accent' },
  { name: 'White', hex: '#FFFFFF', usage: 'Light backgrounds' },
  { name: 'Dark Gray', hex: '#1f2937', usage: 'Dark mode backgrounds' },
]

const TALKING_POINTS = [
  {
    headline: 'Solves a Real Problem',
    detail: 'Parents spend an average of 20+ minutes a day nagging kids about chores. ChoreStar eliminates that by gamifying responsibilities.',
  },
  {
    headline: 'Free to Try, Easy to Love',
    detail: 'No credit card required. Families can track up to 3 kids and 20 chores for free — making it a zero-risk recommendation.',
  },
  {
    headline: 'Works Everywhere',
    detail: 'Browser-based PWA — no app store download needed. Works on phones, tablets, and computers. Parents and kids stay synced in real time.',
  },
  {
    headline: 'Proven Traction',
    detail: '87+ families actively using ChoreStar. 5-star reviews from real parents. Steady organic growth from word-of-mouth.',
  },
  {
    headline: 'Premium Upsell Built In',
    detail: 'Free plan converts naturally to Premium ($4.99/mo) as families grow. Lifetime option ($149.99) for committed users.',
  },
]

const SAMPLE_COPY = [
  {
    label: 'Short (social / ad)',
    text: 'Tired of nagging your kids about chores? ChoreStar turns chores into a game they actually want to play. Free to start — chorestar.app',
  },
  {
    label: 'Medium (email / blog)',
    text: 'ChoreStar is a free family chore tracker that gamifies responsibilities for kids. Parents assign chores and set rewards. Kids log in with a PIN, check off tasks, and watch their earnings grow. No app download needed — works on any device. Join 87+ families at chorestar.app',
  },
  {
    label: 'Tagline options',
    text: '"Turn Household Chores Into Family Wins" · "Stop Nagging. Start Rewarding." · "Finally Get Help Around the House"',
  },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">

      <SiteNav ctaText="Sign Up Free →" ctaHref="/signup" />

      <main>
        <div className="container mx-auto px-4 py-16">

          {/* Hero */}
          <header className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#6366f1' }}>
              Partner Program
            </p>
            <h1 className="text-5xl md:text-6xl font-black mb-6">
              <span style={GRADIENT_TEXT}>Promote ChoreStar</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
              Everything you need to share ChoreStar with your audience.
              Brand assets, approved copy, and a direct line to our team.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              We actively work with ad agencies &amp; content creators
            </div>
          </header>

          {/* Quick Stats */}
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { stat: '87+', label: 'Active families' },
              { stat: '$0', label: 'Free to start' },
              { stat: '5★', label: 'Parent reviews' },
              { stat: 'Any device', label: 'No download needed' },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center shadow-lg border border-indigo-100 dark:border-indigo-900">
                <div className="text-2xl font-black mb-1" style={GRADIENT_TEXT}>{stat}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
              </div>
            ))}
          </div>

          {/* What is ChoreStar */}
          <section className="max-w-4xl mx-auto mb-16">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border border-indigo-100 dark:border-indigo-900">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">What is ChoreStar?</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                ChoreStar is a family chore tracking app that turns household responsibilities into a game kids want to play. Parents assign chores and set daily rewards. Kids log in with a simple PIN, check off their tasks, earn points, unlock achievements, and watch their earnings grow.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                It works in any browser — no app download required — and keeps the whole family synced in real time. Built by a parent, for parents who want less nagging and more cooperation.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Target Audience</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Parents with kids ages 4-15</div>
                </div>
                <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Pricing</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Free plan · Premium $4.99/mo · Lifetime $149.99</div>
                </div>
                <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">URL</div>
                  <div className="text-sm">
                    <a href="https://chorestar.app" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">chorestar.app</a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Talking Points */}
          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              Key Talking Points
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
              Use these when writing about or promoting ChoreStar
            </p>
            <div className="space-y-4">
              {TALKING_POINTS.map(({ headline, detail }) => (
                <div key={headline} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-indigo-100 dark:border-indigo-900">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{headline}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Brand Assets */}
          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              Brand Assets
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
              Logo, colors, and name usage
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Logo */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-indigo-100 dark:border-indigo-900">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Logo</h3>
                <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-16 h-16" aria-label="ChoreStar logo">
                      <defs>
                        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#6366f1"/>
                          <stop offset="1" stopColor="#8b5cf6"/>
                        </linearGradient>
                      </defs>
                      <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#logo-grad)"/>
                      <path d="M32 16l4.1 10.7 11.4.3-9 6.6 3.5 10.9-9.9-6-9.9 6 3.5-10.9-9-6.6 11.4-.3L32 16z" fill="#fff" opacity="0.95"/>
                    </svg>
                    <span className="text-3xl font-black" style={GRADIENT_TEXT}>ChoreStar</span>
                  </div>
                </div>
                <a
                  href="/icon.svg"
                  download="chorestar-logo.svg"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: GRADIENT }}
                >
                  Download Logo (SVG)
                </a>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Please don&apos;t modify the logo colors or proportions. Always use on a clean background.
                </p>
              </div>

              {/* Colors */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-indigo-100 dark:border-indigo-900">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Brand Colors</h3>
                <div className="space-y-3">
                  {BRAND_COLORS.map(({ name, hex, usage }) => (
                    <div key={hex} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{name} <span className="font-mono text-xs text-gray-500">{hex}</span></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{usage}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Gradient:</strong>{' '}
                    <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded text-xs">linear-gradient(135deg, #6366f1, #8b5cf6)</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Name usage */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-indigo-100 dark:border-indigo-900">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Name &amp; Copy Guidelines</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Do</h4>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <li>✅ Write as one word: <strong>ChoreStar</strong></li>
                    <li>✅ Capitalize both C and S</li>
                    <li>✅ Use &quot;ChoreStar&quot; or &quot;the ChoreStar app&quot;</li>
                    <li>✅ Link to <strong>chorestar.app</strong></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Don&apos;t</h4>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                    <li>❌ &quot;Chore Star&quot; (two words)</li>
                    <li>❌ &quot;chorestar&quot; or &quot;CHORESTAR&quot;</li>
                    <li>❌ Modify the logo or brand colors</li>
                    <li>❌ Imply official endorsement without approval</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Approved Copy */}
          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              Ready-to-Use Copy
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
              Feel free to adapt these for your audience
            </p>
            <div className="space-y-4">
              {SAMPLE_COPY.map(({ label, text }) => (
                <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-indigo-100 dark:border-indigo-900">
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-2">{label}</div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              What Parents Say
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-10">
              You&apos;re welcome to quote these in your promotions
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Game changer! My kids actually check ChoreStar every morning to see what needs to be done. No more arguments at bedtime about whether they cleaned their room.',
                  name: 'Sarah M.',
                  role: 'Mom of 3',
                },
                {
                  quote: 'I was skeptical, but my 7-year-old asks ME if she can do more chores now. The earning tracker makes it feel real to her. Worth every penny.',
                  name: 'James T.',
                  role: 'Dad of 2',
                },
                {
                  quote: 'Finally something that works for our blended family. Everyone knows exactly what\'s expected and the kids actually compete to finish first. Love it!',
                  name: 'Michelle R.',
                  role: 'Mom of 4',
                },
              ].map(({ quote, name, role }) => (
                <div key={name} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-indigo-100 dark:border-indigo-900">
                  <div className="text-yellow-400 text-lg mb-3">⭐⭐⭐⭐⭐</div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 italic text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Partner Inquiry Form */}
          <section className="max-w-3xl mx-auto mb-16">
            <div
              className="rounded-2xl shadow-2xl p-8 md:p-12 text-white"
              style={{ background: GRADIENT }}
            >
              <h2 className="text-3xl font-bold text-center mb-3">
                Interested in Partnering?
              </h2>
              <p className="text-center text-lg opacity-90 mb-8">
                Tell us a bit about yourself and how you&apos;d like to promote ChoreStar. We respond within 24 hours.
              </p>
              <PartnerForm />
            </div>
          </section>

          <SiteFooter />

        </div>
      </main>
    </div>
  )
}
