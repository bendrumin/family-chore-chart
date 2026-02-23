import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Resend Confirmation Email',
  description: 'Resend the confirmation email for your ChoreStar account.',
  robots: { index: false, follow: false },
}

export default function ResendConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children
}
