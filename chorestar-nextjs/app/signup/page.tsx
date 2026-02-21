import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/signup-form'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold text-gray-900 dark:text-white">
            🌟 ChoreStar
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Create Family Account
          </h2>
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
