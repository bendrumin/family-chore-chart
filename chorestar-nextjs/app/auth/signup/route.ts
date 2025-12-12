import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const familyName = formData.get('familyName') as string

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        family_name: familyName,
      },
    },
  })

  if (error) {
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // Create profile if user was created
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email!,
      family_name: familyName,
    })
  }

  return NextResponse.redirect(
    new URL('/login?message=Check your email to confirm your account', request.url)
  )
}
