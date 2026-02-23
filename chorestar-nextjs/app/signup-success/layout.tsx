import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up Successful',
  description: 'Your ChoreStar account has been created. Check your email to confirm.',
  robots: { index: false, follow: false },
}

export default function SignupSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
