import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your ChoreStar account to manage chores, track allowances, and keep your family organized.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://chorestar.app/login' },
}

export default async function LoginPage({
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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your family dashboard"
      footer={<>🔒 Your data is secure and encrypted</>}
    >
      <LoginForm next={redirectTo} />
    </AuthShell>
  )
}
