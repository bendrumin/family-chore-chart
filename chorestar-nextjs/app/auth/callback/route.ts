import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Unable to confirm email. Please try again.')}`, requestUrl.origin)
      )
    }

    // Successful confirmation - redirect to dashboard or specified next URL
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code present, redirect to login
  return NextResponse.redirect(
    new URL('/login?error=No confirmation code found', requestUrl.origin)
  )
}
