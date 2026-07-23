import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/signup-form'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = {
  title: 'Create Your Free Account',
  description: 'Sign up for ChoreStar — the free chore chart app that turns household tasks into a game kids love. No credit card required.',
  openGraph: {
    title: 'Create Your Free ChoreStar Account',
    description: 'Sign up for ChoreStar and start tracking chores, allowances, and rewards for your family today.',
    url: 'https://chorestar.app/signup',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Create Your Free ChoreStar Account',
    description: 'Sign up for ChoreStar and start tracking chores, allowances, and rewards for your family today.',
    images: ['/og-image.png'],
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
    <AuthShell
      tag="Free to start"
      title="Create your family"
      subtitle="Start tracking chores today — it's free!"
      footer={<>🔒 Your data is secure and encrypted</>}
    >
      <SignupForm next={redirectTo} />
    </AuthShell>
  )
}
