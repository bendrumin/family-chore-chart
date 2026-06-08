import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') || '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'

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

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const familyName =
        user.user_metadata?.family_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Family'

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',
            family_name: familyName,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )

      if (profileError) {
        console.error('Error ensuring OAuth profile:', profileError)
      }
    }

    // Successful confirmation - redirect to dashboard or specified next URL
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code present, redirect to login
  return NextResponse.redirect(
    new URL('/login?error=No confirmation code found', requestUrl.origin)
  )
}
