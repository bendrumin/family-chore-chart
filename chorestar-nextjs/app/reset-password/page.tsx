import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your ChoreStar account.',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set new password"
      subtitle="Enter your new password below"
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}

