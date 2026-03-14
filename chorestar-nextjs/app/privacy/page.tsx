import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ChoreStar privacy policy. Learn how we collect, use, and protect your family\'s data.',
}

const LAST_UPDATED = 'February 24, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <Section title="Overview">
            <p>
              ChoreStar (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates chorestar.app and the ChoreStar iOS app
              (collectively, the &quot;Service&quot;). This policy explains what data we collect, why we collect it,
              how we use it, and your rights regarding that data.
            </p>
            <p>
              We built ChoreStar for families and take privacy seriously — especially because families with children use
              our app. We do not sell your data. We do not run ads. We never share personal information with third
              parties except as required to operate the Service.
            </p>
          </Section>

          <Section title="Information We Collect">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Account information (parents)</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Email address — used for account creation, login, and transactional emails</li>
              <li>Password — stored as a secure hash; we never see your plaintext password</li>
              <li>Family name — used to personalize the dashboard</li>
              <li>Subscription status — to determine which features are available</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Family data (entered by parents)</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Children&apos;s names and ages</li>
              <li>Avatar colors and images (if uploaded)</li>
              <li>Chore names, descriptions, and reward amounts</li>
              <li>Routine names and steps</li>
              <li>Chore and routine completion history</li>
              <li>Achievement badges earned</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Data we do NOT collect from children</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Children do not create accounts or provide personal information. They access the app through a
              family-specific link and a numeric PIN set by a parent. We do not collect names, emails,
              or any personal data directly from children.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Usage data</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>IP address and approximate location (for security and rate limiting)</li>
              <li>Browser/device type and OS version</li>
              <li>Pages visited and features used (for product improvement)</li>
              <li>Error logs (to fix bugs)</li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>To provide, maintain, and improve the ChoreStar Service</li>
              <li>To authenticate your account and keep it secure</li>
              <li>To process payments and manage your subscription</li>
              <li>To send transactional emails (receipts, password resets, confirmations)</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent fraud, abuse, or unauthorized access</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              We do not use your data for advertising, profiling, or any purpose not listed above.
            </p>
          </Section>

          <Section title="Data Sharing">
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We share data only with the following trusted service providers, and only to the extent necessary
              to operate the Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Supabase</strong> — database, authentication, and file storage infrastructure.
                Data is encrypted in transit and at rest.
              </li>
              <li>
                <strong>Stripe</strong> — payment processing. We never store your card number or payment details;
                Stripe handles all payment data under their own PCI-compliant infrastructure.
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery (password resets, receipts).
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              We do not sell, rent, or trade personal information with any third party for their own marketing purposes.
              We do not share data with data brokers or advertising networks.
            </p>
          </Section>

          <Section title="Children's Privacy (COPPA)">
            <p className="text-gray-700 dark:text-gray-300">
              ChoreStar is designed for use by parents and guardians to manage chore schedules for their children.
              The account holder is always an adult parent or guardian.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              Children do not register accounts, provide an email address, or submit personal information to us directly.
              Any information about children (names, ages, avatar) is entered and controlled solely by the parent
              account holder.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              If you believe we have inadvertently collected personal information from a child under 13 without
              verifiable parental consent, please contact us at{' '}
              <a href="mailto:privacy@chorestar.app" className="text-indigo-600 hover:underline">privacy@chorestar.app</a>{' '}
              and we will delete it promptly.
            </p>
          </Section>

          <Section title="Data Retention">
            <p className="text-gray-700 dark:text-gray-300">
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete your personal data and family data within 30 days, except where we are required
              to retain it for legal or billing purposes (e.g., payment records).
            </p>
          </Section>

          <Section title="Your Rights">
            <p className="text-gray-700 dark:text-gray-300 mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Correction</strong> — update or correct inaccurate information</li>
              <li><strong>Deletion</strong> — request that we delete your account and associated data</li>
              <li><strong>Portability</strong> — receive your data in a portable format</li>
              <li><strong>Objection</strong> — object to certain uses of your data</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:privacy@chorestar.app" className="text-indigo-600 hover:underline">privacy@chorestar.app</a>.
              We will respond within 30 days.
            </p>
          </Section>

          <Section title="Security">
            <p className="text-gray-700 dark:text-gray-300">
              All data is transmitted over HTTPS/TLS. Passwords are hashed using industry-standard algorithms.
              Database access is restricted by row-level security policies. We regularly review our security
              practices and promptly address any vulnerabilities.
            </p>
          </Section>

          <Section title="iOS App">
            <p className="text-gray-700 dark:text-gray-300">
              The ChoreStar iOS app stores a child session token in device storage (UserDefaults) to keep
              a child logged in between sessions. This token is stored only on the device and is never
              transmitted to third parties. It can be cleared by logging out or uninstalling the app.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p className="text-gray-700 dark:text-gray-300">
              We may update this policy from time to time. When we make material changes, we will update the
              &quot;Last updated&quot; date at the top and, if the changes are significant, notify account holders
              by email. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="Contact Us">
            <p className="text-gray-700 dark:text-gray-300">
              If you have questions about this Privacy Policy or how your data is handled:
            </p>
            <ul className="list-none mt-3 space-y-1 text-gray-700 dark:text-gray-300">
              <li>📧 <a href="mailto:privacy@chorestar.app" className="text-indigo-600 hover:underline">privacy@chorestar.app</a></li>
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
