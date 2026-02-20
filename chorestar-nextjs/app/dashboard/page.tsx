import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getEffectiveFamilyId } from '@/lib/utils/family'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Detect if this user is a shared family member
  const { effectiveUserId, isSharedMember } = await getEffectiveFamilyId(supabase, user.id)

  // Get profile — if member, fetch owner's profile for family name display
  let profile = null
  const admin = createServiceRoleClient()

  if (isSharedMember) {
    const { data: ownerProfile } = await (admin as any)
      .from('profiles')
      .select('*')
      .eq('id', effectiveUserId)
      .single()
    profile = ownerProfile
  } else {
    const { data: ownProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, creating one for user:', user.id)
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
        return <DashboardClient
          initialUser={user}
          initialProfile={{
            id: user.id,
            email: user.email!,
            family_name: familyName,
            subscription_tier: 'free'
          }}
          effectiveUserId={user.id}
          isSharedMember={false}
        />
      }

      return <DashboardClient
        initialUser={user}
        initialProfile={newProfile}
        effectiveUserId={user.id}
        isSharedMember={false}
      />
    }

    profile = ownProfile
  }

  return (
    <DashboardClient
      initialUser={user}
      initialProfile={profile}
      effectiveUserId={effectiveUserId}
      isSharedMember={isSharedMember}
    />
  )
}
