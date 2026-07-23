import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your ChoreStar password.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
          ← Back to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}

