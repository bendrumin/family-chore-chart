import type { Metadata } from 'next'
import Link from 'next/link'
import { ChoreStarLogo } from '@/components/brand/logo'
import { GRADIENT_TEXT } from '@/lib/constants/brand'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your ChoreStar password.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold" style={GRADIENT_TEXT}>
            <span className="inline-flex items-center gap-2"><ChoreStarLogo size={36} /> ChoreStar</span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <ForgotPasswordForm />
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}

