import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get('email')
    const password = formData.get('password')

    if (!email || !password) {
      return NextResponse.redirect(
        new URL('/login?error=Email+and+password+are+required', request.url)
      )
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: String(email),
      password: String(password),
    })

    if (error) {
      const friendlyMessage =
        error.message === 'Invalid login credentials'
          ? 'Invalid email or password'
          : 'Login failed. Please try again.'
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(friendlyMessage)}`, request.url)
      )
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=Something+went+wrong.+Please+try+again.', request.url)
    )
  }
}
