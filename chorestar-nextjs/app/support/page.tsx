import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { Mail, BookOpen, ShieldCheck, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support & Help',
  description: 'Get help with ChoreStar — contact support, browse how-to guides, and find answers to common questions about kid login, allowance, routines, and subscriptions.',
  openGraph: {
    title: 'Support & Help | ChoreStar',
    description: 'Get help with ChoreStar — contact support, how-to guides, and answers to common questions.',
    url: 'https://chorestar.app/support',
  },
  alternates: { canonical: 'https://chorestar.app/support' },
}

const FAQS = [
  {
    q: 'How do my kids log in?',
    a: 'Kids don\'t need an email or account. In Settings → Family you\'ll find your unique family code, and you set a 4-digit PIN for each child in their edit screen. Your child opens the app (or chorestar.app/kid-login), enters the family code and their PIN, and lands on their own chore view.',
  },
  {
    q: 'How do I set or reset a child\'s PIN?',
    a: 'Open the child\'s edit screen from the Family list and enter a new 4–6 digit PIN. You can change it anytime; PINs are stored securely and never in plain text.',
  },
  {
    q: 'How does allowance work?',
    a: 'Choose a reward mode in Settings — a flat daily amount, or a custom amount per chore. ChoreStar automatically tallies each child\'s earnings as chores are completed, so it\'s always clear how much they\'ve earned.',
  },
  {
    q: 'What are routines?',
    a: 'Routines are step-by-step sequences (morning, bedtime, after-school, or custom) that kids run on their own — with optional per-step timers and a reward for finishing. On iPhone, the current step\'s timer even appears on the Lock Screen and Dynamic Island.',
  },
  {
    q: 'How do I manage or cancel my subscription?',
    a: 'Premium purchased in the iPhone app is managed in iOS Settings → your name → Subscriptions. Purchases made on chorestar.app are managed from the billing section of your account. Cancelling keeps Premium active until the end of the current period.',
  },
  {
    q: 'Is my family\'s data private?',
    a: 'Yes. We never sell or share your data, and children never provide an email or personal information — they sign in with a family code and PIN only. See our Privacy Policy for full details.',
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Support &amp; Help</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
          We&apos;re here to help you and your family get the most out of ChoreStar.
        </p>

        {/* Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-900/30">
              <Mail className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Contact us</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Have a question, found a bug, or want to suggest a feature? Email us and we&apos;ll get back to you as soon as we can — usually within one business day.
              </p>
              <a
                href="mailto:hi@chorestar.app"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                <Mail className="w-5 h-5" />
                hi@chorestar.app
              </a>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <Link href="/how-to" className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all">
            <BookOpen className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">How-To Guides</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Step-by-step tutorials for setting up chores, routines, and kid login.</p>
          </Link>
          <Link href="/privacy" className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all">
            <ShieldCheck className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Privacy Policy</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">How we protect your family&apos;s data. We never sell it or run ads.</p>
          </Link>
        </div>

        {/* FAQ */}
        <div className="flex items-center gap-2 mb-5">
          <MessageCircle className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group bg-white dark:bg-gray-800 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-sm overflow-hidden">
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

        <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Still stuck? Email{' '}
          <a href="mailto:hi@chorestar.app" className="underline hover:text-indigo-600 transition-colors">hi@chorestar.app</a>
          {' '}and a real person (a parent, like you) will help.
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
