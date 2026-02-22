import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get('email')
    const password = formData.get('password')
    const familyName = formData.get('familyName')

    if (!email || !password || !familyName) {
      return NextResponse.redirect(
        new URL('/signup?error=All+fields+are+required', request.url)
      )
    }

    const supabase = await createClient()
    const origin = new URL(request.url).origin

    const { data, error } = await supabase.auth.signUp({
      email: String(email),
      password: String(password),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          family_name: String(familyName),
        },
      },
    })

    if (error) {
      return NextResponse.redirect(
        new URL(`/signup?error=${encodeURIComponent('Signup failed. Please try again.')}`, request.url)
      )
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email || String(email),
        family_name: String(familyName),
      })

      if (profileError) {
        console.error('Failed to create profile during signup:', profileError)
      }
    }

    return NextResponse.redirect(
      new URL(`/signup-success?email=${encodeURIComponent(String(email))}`, request.url)
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.redirect(
      new URL('/signup?error=Something+went+wrong.+Please+try+again.', request.url)
    )
  }
}
