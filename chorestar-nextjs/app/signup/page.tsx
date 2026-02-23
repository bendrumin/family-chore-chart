import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Create Your Free Account',
  description: 'Sign up for ChoreStar — the free chore chart app that turns household tasks into a game kids love. No credit card required.',
  openGraph: {
    title: 'Create Your Free ChoreStar Account',
    description: 'Sign up for ChoreStar and start tracking chores, allowances, and rewards for your family today.',
    url: 'https://chorestar.app/signup',
  },
  twitter: {
    card: 'summary',
    title: 'Create Your Free ChoreStar Account',
    description: 'Sign up for ChoreStar and start tracking chores, allowances, and rewards for your family today.',
  },
  alternates: { canonical: 'https://chorestar.app/signup' },
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { next } = await searchParams
  const redirectTo = next || '/dashboard'

  if (user) {
    redirect(redirectTo)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold" style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            <span style={{ WebkitTextFillColor: 'initial' }}>🌟</span> ChoreStar
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Create Family Account
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Start tracking chores today - it's free!
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <SignupForm next={redirectTo} />
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          🔒 Your data is secure and encrypted
        </p>
      </div>
    </div>
  )
}
