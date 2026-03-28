import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Give Kids Their Own Chore App — No Email Required',
  description: 'Most apps require an email to sign up. Here\'s how ChoreStar lets kids log in with just a family code and a 4-digit PIN — no email, no password, no hassle.',
  keywords: [
    'kids chore app no email',
    'chore app for kids without email',
    'kid login chore chart',
    'PIN based login for kids',
    'child friendly app login',
    'family chore app kids login',
  ],
  openGraph: {
    title: 'How to Give Kids Their Own Chore App — No Email Required',
    description: 'How ChoreStar lets kids log in with just a family code and a 4-digit PIN.',
    url: 'https://chorestar.app/blog/kids-chore-app-no-email',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Give Kids Their Own Chore App — No Email Required',
    description: 'How ChoreStar lets kids log in with just a family code and a 4-digit PIN.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog/kids-chore-app-no-email',
  },
}

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Give Kids Their Own Chore App — No Email Required',
  description: 'Most apps require an email to sign up. Here\'s how ChoreStar lets kids log in with just a family code and a 4-digit PIN.',
  url: 'https://chorestar.app/blog/kids-chore-app-no-email',
  datePublished: '2026-03-28',
  dateModified: '2026-03-28',
  author: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
  publisher: { '@type': 'Organization', name: 'ChoreStar', url: 'https://chorestar.app' },
}

export default function KidsChoreAppNoEmailPage() {
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
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Features</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">March 28, 2026</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">5 min read</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
              How to Give Kids Their Own Chore App — No Email Required
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Most chore apps make everyone create an account. That doesn&apos;t work when your users are 6 years old.
            </p>
          </header>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Problem With Kids and Accounts</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Your 7-year-old doesn&apos;t have an email address. And you probably don&apos;t want to create one just so they
              can check off &ldquo;brush teeth&rdquo; on a chore chart. Most family apps either require every user to have a
              full account, or they force everyone to share a single login — which means kids can&apos;t independently access
              their own tasks.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar solves this with what we call Kid Login: a PIN-based system where kids get their own independent
              access without needing an email, password, or any personal information at all.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How Kid Login Works</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The setup takes about 60 seconds. Here&apos;s the flow:
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden my-6">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { num: '1', title: 'Parent gets the family code', desc: 'Go to Settings → Family. Your unique family code is right there — it\'s auto-generated when you create your account.' },
                  { num: '2', title: 'Parent sets a PIN for each child', desc: 'Open a child\'s edit modal and set a 4-digit PIN. The PIN is hashed with SHA-256 and a random salt — we never store it in plain text.' },
                  { num: '3', title: 'Kid visits the family link', desc: 'The link looks like chorestar.app/kid-login/abc123. Bookmark it on the family tablet, text it to their phone, or add it as a home screen shortcut.' },
                  { num: '4', title: 'Kid enters their PIN', desc: 'A big, colorful number pad shows up — designed for small fingers. They tap their 4 digits and they\'re in.' },
                  { num: '5', title: 'Kid lands on their dashboard', desc: 'They see their name, their avatar, and their routines with big "Start" buttons. No menus, no sibling mix-ups, just their stuff.' },
                ].map(({ num, title, desc }) => (
                  <div key={num} className="flex gap-4 px-5 py-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-bold flex items-center justify-center">{num}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Kids See</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The kid dashboard is intentionally simple. When your child logs in, they see a greeting (&ldquo;Hi, Emma! 👋
              Ready for your routines?&rdquo;), their avatar, and a grid of their active routines. Each routine card has
              the routine name, its type icon (🌅 for morning, 🌙 for bedtime, 🎒 for after school), and a big
              &ldquo;Play Routine&rdquo; button.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              There&apos;s no navigation menu, no settings, no sibling data visible. Kids see only their own routines. This
              is by design — the fewer distractions, the more likely they are to just tap &ldquo;Start&rdquo; and get going.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Without Complexity</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We take PIN security seriously despite the simplicity of the interface. The PIN is hashed using SHA-256
              with a unique random salt per child — the same approach used for passwords, just with a shorter input.
              Verification uses constant-time comparison to prevent timing attacks. And there&apos;s rate limiting: 5 PIN
              attempts per 15 minutes per IP address before the account locks temporarily.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              When a PIN is verified correctly, ChoreStar creates a temporary session token that expires after 8 hours.
              That means kids stay logged in during the day but the session naturally expires overnight — ready for
              a fresh login the next morning. If a child forgets their PIN, a parent can reset it instantly from the
              child&apos;s edit modal.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy by Design</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Children don&apos;t create accounts, provide an email address, or submit personal information to ChoreStar
              directly. Any information about children — names, ages, avatars — is entered and controlled solely by the
              parent account holder. Kids interact with the app through a family-specific link and a numeric PIN, and
              the session token is stored only on their device.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              This matters for COPPA compliance, but it also just makes sense. A 6-year-old shouldn&apos;t need to hand over
              personal data to check off &ldquo;make bed.&rdquo;
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">The Practical Setup</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The most popular setup we see is parents bookmarking the family link on a shared family tablet.
              Kids walk up, tap the bookmark, punch in their PIN, and they&apos;re running their morning routine in seconds.
              Some families text the link to older kids who have their own phones. Either way, it takes under a minute to
              go from &ldquo;my kid doesn&apos;t have access&rdquo; to &ldquo;my kid is independently checking off chores.&rdquo;
            </p>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800 my-8">
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Try Kid Login today</p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                Sign up free, add your kids, set their PINs, and share the family link. No credit card, no email
                for kids — just a code and a PIN.
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
