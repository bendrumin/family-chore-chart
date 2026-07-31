import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'ChoreStar Terms of Use (EULA), including subscription, billing, and auto-renewal terms.',
  openGraph: {
    title: 'Terms of Use | ChoreStar',
    description: 'The terms that govern your use of ChoreStar, including subscription and auto-renewal terms.',
    url: 'https://chorestar.app/terms',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Use | ChoreStar',
    description: 'The terms that govern your use of ChoreStar, including subscription and auto-renewal terms.',
  },
  alternates: {
    canonical: 'https://chorestar.app/terms',
  },
}

const LAST_UPDATED = 'July 31, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <Section title="Acceptance of These Terms">
            <p>
              These Terms of Use (the &quot;Terms&quot;) are a legal agreement between you and ChoreStar
              (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) governing your use of chorestar.app and the
              ChoreStar mobile apps (collectively, the &quot;Service&quot;). By creating an account, subscribing,
              or otherwise using the Service, you agree to these Terms. If you do not agree, please do not use the
              Service.
            </p>
            <p>
              These Terms also serve as the End User License Agreement (EULA) for the ChoreStar apps. For
              subscriptions purchased through the Apple App Store, Apple&apos;s{' '}
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                className="text-indigo-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Standard End User License Agreement
              </a>{' '}
              also applies.
            </p>
          </Section>

          <Section title="Who Can Use ChoreStar">
            <p className="text-gray-700 dark:text-gray-300">
              The account holder must be an adult (18 or older) — a parent or guardian. ChoreStar is a tool for
              adults to manage chores and routines for children in their care. Children access the app through a
              family-specific link and a numeric PIN set by a parent; children do not create accounts or agree to
              these Terms themselves. The account holder is responsible for supervising children&apos;s use of the
              Service.
            </p>
          </Section>

          <Section title="Your Account">
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>You are responsible for keeping your login credentials and family PINs secure.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You agree to provide accurate account information and to keep it up to date.</li>
              <li>Notify us promptly at <a href="mailto:hi@chorestar.com" className="text-indigo-600 hover:underline">hi@chorestar.com</a> if you suspect unauthorized use of your account.</li>
            </ul>
          </Section>

          <Section title="Subscriptions, Billing & Auto-Renewal">
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar offers a free tier and optional paid subscriptions (&quot;ChoreStar Premium&quot;) that unlock
              additional features. Subscription options, billing periods, and current prices are shown on the purchase
              screen before you confirm. We currently offer monthly and annual auto-renewable subscriptions and, where
              available, a one-time lifetime purchase.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Purchases through the Apple App Store</h3>
            <p className="text-gray-700 dark:text-gray-300">
              For auto-renewable subscriptions purchased in our iOS app:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Payment is charged to your Apple ID account at confirmation of purchase.</li>
              <li>The subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.</li>
              <li>Your account is charged for renewal within 24 hours prior to the end of the current period, at the price of the plan you selected.</li>
              <li>You can manage or cancel your subscription at any time in your Apple ID / App Store account settings after purchase.</li>
              <li>Any unused portion of a free trial period, if offered, is forfeited when you purchase a subscription.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              Subscriptions purchased through the App Store are subject to Apple&apos;s terms, and refunds for those
              purchases are handled by Apple in accordance with their policies.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Purchases on the web</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Subscriptions purchased on chorestar.app are processed by Stripe. Web subscriptions renew automatically
              at the end of each billing period until canceled. You can manage or cancel your web subscription from your
              account&apos;s billing settings; cancellation takes effect at the end of the current billing period.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Price changes</h3>
            <p className="text-gray-700 dark:text-gray-300">
              We may change subscription prices from time to time. Any price change applies to future billing periods,
              and we will provide notice as required by the applicable app store or by law.
            </p>
          </Section>

          <Section title="Acceptable Use">
            <p className="text-gray-700 dark:text-gray-300 mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Use the Service for any unlawful purpose or in violation of these Terms;</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
              <li>Interfere with or disrupt the integrity or performance of the Service;</li>
              <li>Reverse engineer, decompile, or attempt to extract source code except as permitted by law;</li>
              <li>Resell, sublicense, or commercially exploit the Service without our written permission.</li>
            </ul>
          </Section>

          <Section title="Your Content & Data">
            <p className="text-gray-700 dark:text-gray-300">
              You retain ownership of the data you enter (such as children&apos;s names, chores, and routines). You grant
              us a limited license to store and process that data solely to operate the Service for you. Our handling of
              personal data is described in our{' '}
              <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>, which is incorporated
              into these Terms by reference.
            </p>
          </Section>

          <Section title="Intellectual Property">
            <p className="text-gray-700 dark:text-gray-300">
              The Service, including its software, design, branding, and content (excluding data you enter), is owned by
              ChoreStar and protected by intellectual-property laws. We grant you a limited, non-exclusive,
              non-transferable, revocable license to use the Service for your personal, family use in accordance with
              these Terms.
            </p>
          </Section>

          <Section title="Third-Party Services">
            <p className="text-gray-700 dark:text-gray-300">
              The Service relies on third-party providers (including Apple, Supabase, Stripe, and Resend) to operate.
              Your use of purchases and features provided through those parties may also be subject to their respective
              terms.
            </p>
          </Section>

          <Section title="Disclaimers">
            <p className="text-gray-700 dark:text-gray-300">
              The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind,
              whether express or implied, to the fullest extent permitted by law. We do not warrant that the Service will
              be uninterrupted, error-free, or completely secure. ChoreStar is a tool to help organize household chores;
              it is not a substitute for parental judgment or supervision.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p className="text-gray-700 dark:text-gray-300">
              To the fullest extent permitted by law, ChoreStar will not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of data, arising from your use of the Service.
              Our total liability for any claim relating to the Service will not exceed the amount you paid us in the
              twelve months before the claim arose.
            </p>
          </Section>

          <Section title="Termination">
            <p className="text-gray-700 dark:text-gray-300">
              You may stop using the Service and delete your account at any time. We may suspend or terminate your access
              if you violate these Terms or use the Service in a way that could harm us, other users, or third parties.
              On termination, your right to use the Service ends; sections that by their nature should survive
              (including intellectual property, disclaimers, and limitation of liability) will continue to apply.
            </p>
          </Section>

          <Section title="Changes to These Terms">
            <p className="text-gray-700 dark:text-gray-300">
              We may update these Terms from time to time. When we make material changes, we will update the
              &quot;Last updated&quot; date above and, where appropriate, notify account holders. Continued use of the
              Service after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="Governing Law">
            <p className="text-gray-700 dark:text-gray-300">
              These Terms are governed by the laws of the United States and the state in which the operator of ChoreStar
              is established, without regard to conflict-of-law principles. Nothing in these Terms limits any consumer
              protections that may apply to you under the mandatory laws of your place of residence.
            </p>
          </Section>

          <Section title="Contact Us">
            <p className="text-gray-700 dark:text-gray-300">
              Questions about these Terms?
            </p>
            <ul className="list-none mt-3 space-y-1 text-gray-700 dark:text-gray-300">
              <li>📧 <a href="mailto:hi@chorestar.com" className="text-indigo-600 hover:underline">hi@chorestar.com</a></li>
              <li>🌐 <a href="https://chorestar.app" className="text-indigo-600 hover:underline">chorestar.app</a></li>
            </ul>
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
