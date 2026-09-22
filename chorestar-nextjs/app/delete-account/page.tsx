import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

/**
 * The public account-deletion page Google Play requires in the store listing.
 *
 * Play's rules for this URL: it has to name the app, spell out the steps to
 * request deletion, and say what is deleted, what is kept and for how long. It
 * also has to work for someone who never installs the app, so nothing here is
 * behind a login.
 */
export const metadata: Metadata = {
  title: 'Delete Your ChoreStar Account',
  description:
    'How to delete your ChoreStar account and family data, what gets deleted, and what we keep.',
  openGraph: {
    title: 'Delete Your ChoreStar Account | ChoreStar',
    description: 'Delete your ChoreStar account and family data in the app, on the web, or by email.',
    url: 'https://chorestar.app/delete-account',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://chorestar.app/delete-account' },
}

const LAST_UPDATED = 'September 21, 2026'

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">
          Delete your ChoreStar account
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Last updated {LAST_UPDATED}</p>

        <div className="space-y-10 text-gray-700 dark:text-gray-300 leading-relaxed">
          <Section title="Who this is for">
            <p>
              ChoreStar is a family chore chart made by Siegel Creates, published on Google Play and
              the App Store and available at chorestar.app. This page explains how to delete the
              parent account that holds your family&apos;s data, and exactly what happens to that data.
              Deleting the account removes it from every platform at once, because all three apps
              share one account.
            </p>
          </Section>

          <Section title="Delete it yourself, in about ten seconds">
            <p className="font-semibold text-gray-900 dark:text-white">In the Android or iOS app</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Open ChoreStar and sign in as the parent.</li>
              <li>Go to the <strong>Settings</strong> tab.</li>
              <li>Under <strong>Account</strong>, tap <strong>Delete Account</strong>.</li>
              <li>
                Read what will be removed, type <strong>DELETE</strong> to confirm, then tap{' '}
                <strong>Delete My Account</strong>.
              </li>
            </ol>
            <p className="font-semibold text-gray-900 dark:text-white pt-2">On the web</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>
                Sign in at{' '}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 underline">
                  chorestar.app/login
                </Link>
                .
              </li>
              <li>Open <strong>Settings</strong>, then the <strong>Account</strong> section.</li>
              <li>
                Choose <strong>Delete Account</strong>, type <strong>DELETE</strong> and confirm.
              </li>
            </ol>
            <p className="pt-2">
              Deletion happens immediately and cannot be undone. You are signed out as soon as it
              finishes, and the account can no longer be used to sign in anywhere.
            </p>
          </Section>

          <Section title="If you cannot sign in">
            <p>
              Email{' '}
              <a href="mailto:hi@chorestar.app" className="text-indigo-600 dark:text-indigo-400 underline">
                hi@chorestar.app
              </a>{' '}
              from the address on the account and ask us to delete it. We reply within a few days and
              delete it once we have confirmed the request comes from the account holder. Write
              &quot;delete my account&quot; in the subject so it is not mistaken for a support question.
            </p>
          </Section>

          <Section title="What is deleted">
            <p>All of the following is erased and cannot be recovered:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Your login and parent profile, including your email address and family name</li>
              <li>Every child you added, with their names, ages, avatars and uploaded photos</li>
              <li>Their four-digit PINs and your family&apos;s kid login code</li>
              <li>All chores, routines and their steps</li>
              <li>The whole completion history, including any photo proof</li>
              <li>Allowance totals, payouts, goals and reward store items</li>
              <li>Achievement badges and streaks</li>
              <li>Family sharing membership and invites, so a co-parent loses access too</li>
              <li>Notification tokens for every device signed in to the account</li>
            </ul>
          </Section>

          <Section title="What we keep, and for how long">
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>
                <strong>Payment records.</strong> If you ever subscribed, the record of the
                transaction is kept by our payment providers and by us where tax and accounting law
                requires it, normally seven years. These records contain the purchase, not your
                family&apos;s chore data.
              </li>
              <li>
                <strong>Backups.</strong> Deleted data can persist in encrypted database backups for
                up to 30 days, after which it is overwritten.
              </li>
              <li>
                <strong>Support email.</strong> If you wrote to us, that correspondence stays in our
                mailbox unless you ask us to remove it.
              </li>
            </ul>
            <p>Nothing else is retained, and we never sell or share family data.</p>
          </Section>

          <Section title="Cancel your subscription first">
            <p>
              Deleting your account does not cancel a subscription bought through Google Play or the
              App Store, because those are billed by the store rather than by us. Cancel it in{' '}
              <strong>Google Play, Subscriptions</strong> or in{' '}
              <strong>Apple, Settings, Subscriptions</strong> before you delete the account,
              otherwise the store may keep billing you. A subscription bought on chorestar.app with a
              card is cancelled automatically when the account is deleted.
            </p>
          </Section>

          <Section title="More detail">
            <p>
              Our{' '}
              <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 underline">
                privacy policy
              </Link>{' '}
              covers what we collect and why. Questions about a deletion are welcome at{' '}
              <a href="mailto:hi@chorestar.app" className="text-indigo-600 dark:text-indigo-400 underline">
                hi@chorestar.app
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
