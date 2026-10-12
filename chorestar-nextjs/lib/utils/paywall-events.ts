import { createClient } from '@/lib/supabase/client'

/**
 * Records that a parent opened the upgrade screen and why (migration 027), so
 * the founder hub can show which limit or feature sells Premium. Best-effort:
 * a failure never gets in the way of upgrading.
 */
export async function logPaywallOpen(source: string, platform: 'web' | 'android' = 'web'): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // paywall_events (migration 027) isn't in the generated types.
    await (supabase as any).from('paywall_events').insert({ user_id: user.id, source: source.slice(0, 40), platform })
  } catch {
    // Analytics only.
  }
}
