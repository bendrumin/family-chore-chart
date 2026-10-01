import type { Metadata } from 'next'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { isAdminEmail } from '@/lib/admin/is-admin'
import { buildSignupSource, ensureProfile, resolveFamilyName, type ProfileWriter } from '@/lib/auth/signup-profile'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your family chores, routines, and allowances.',
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Detect if this user is a shared family member
  let effectiveUserId = user.id
  let isSharedMember = false
  try {
    const result = await getEffectiveFamilyId(supabase, user.id)
    effectiveUserId = result.effectiveUserId
    isSharedMember = result.isSharedMember
  } catch (err) {
    console.error('Failed to determine family membership:', err)
  }

  // Get profile — if member, fetch owner's profile for family name display
  let profile = null

  if (isSharedMember) {
    try {
      const admin = createServiceRoleClient()
      const { data: ownerProfile } = await (admin as any)
        .from('profiles')
        .select('*')
        .eq('id', effectiveUserId)
        .single()
      profile = ownerProfile
    } catch (err) {
      console.error('Failed to fetch owner profile:', err)
    }
  } else {
    const { data: ownProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // No profile (an account that slipped past every signup path): make the
    // full row, kid login code included, rather than a bare one.
    if (profileError && profileError.code === 'PGRST116') {
      console.warn('Profile not found, creating one for user:', user.id)
      const { name } = resolveFamilyName(null, user.user_metadata, user.email)
      const admin = createServiceRoleClient()
      const { error: createError } = await ensureProfile(admin as unknown as ProfileWriter, {
        id: user.id,
        email: user.email || '',
        familyName: name,
        signupSource: buildSignupSource(null, 'web', String(user.app_metadata?.provider || 'email')),
      })
      if (createError) console.error('Failed to create profile:', createError)
      const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      return <DashboardClient
        initialUser={user}
        initialProfile={newProfile ?? {
          id: user.id,
          email: user.email!,
          family_name: name,
          subscription_type: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          kid_login_code: null,
        }}
        effectiveUserId={user.id}
        isSharedMember={false}
        isAdmin={isAdminEmail(user.email)}
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
      isAdmin={isAdminEmail(user.email)}
    />
  )
}
