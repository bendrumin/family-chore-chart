import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist, create it
  if (profileError && profileError.code === 'PGRST116') {
    console.log('Profile not found, creating one for user:', user.id)

    // Extract family name from user metadata or use email
    const familyName = user.user_metadata?.family_name || user.email?.split('@')[0] || 'Family'

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        family_name: familyName,
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create profile:', createError)
      // Continue anyway with a basic profile object
      return <DashboardClient
        initialUser={user}
        initialProfile={{
          id: user.id,
          email: user.email!,
          family_name: familyName,
          subscription_tier: 'free'
        }}
      />
    }

    return <DashboardClient initialUser={user} initialProfile={newProfile} />
  }

  return <DashboardClient initialUser={user} initialProfile={profile} />
}
