'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ATTRIBUTION_COOKIE, getAttribution } from '@/lib/utils/attribution'

/**
 * "Continue with Apple" for the web login and signup forms. Supabase sends the
 * browser to Apple, Apple posts back to Supabase, and Supabase lands on
 * /auth/callback, which makes the family on a first sign-in (see
 * lib/auth/signup-profile.ts).
 *
 * The first-touch attribution in localStorage cannot survive that round trip,
 * so it rides a ten-minute cookie the callback reads and deletes.
 *
 * Styled per Apple's guidelines: black on light surfaces, white on dark, the
 * Apple logo, no other colors.
 */
export function AppleSignInButton({ label = 'Continue with Apple' }: { label?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      const attribution = getAttribution()
      if (attribution) {
        const secure = window.location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(attribution))}; Max-Age=600; Path=/; SameSite=Lax${secure}`
      }
      const { error } = await createClient().auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      if (error) throw error
      // The browser is navigating to Apple; leave the spinner up.
    } catch (err) {
      console.error('Apple sign-in failed to start:', err)
      toast.error('Could not reach Apple. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-white dark:text-black"
    >
      <svg aria-hidden="true" viewBox="0 0 17 20" className="h-[18px] w-[18px] fill-current">
        <path d="M14.04 10.63c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66ZM11.77 3.88c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28Z" />
      </svg>
      {isLoading ? 'Opening Apple…' : label}
    </button>
  )
}

/** The "or" rule between the provider button and the email form. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
      <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      or use email
      <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}
