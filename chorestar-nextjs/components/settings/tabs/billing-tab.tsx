'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CreditCard, Crown, CheckCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSettings } from '@/lib/contexts/settings-context'
import { PricingCard } from '@/components/payment/pricing-card'
import { createCheckoutSession, createPortalSession, type PlanType } from '@/lib/utils/stripe'
import { toast } from 'sonner'
import { isPremium as checkPremium } from '@/lib/utils/subscription'
import { useAndroidShell } from '@/lib/utils/platform'
import { playBillingAvailable } from '@/lib/utils/play-billing-client'
import { PlayBillingPlans } from '@/components/settings/play-billing-plans'
import type { Database } from '@/lib/supabase/database.types'

// apple_original_transaction_id / google_purchase_token (migrations 018, 022)
// aren't in the generated types; they say which store bills the family.
type Profile = Database['public']['Tables']['profiles']['Row'] & {
  apple_original_transaction_id?: string | null
  google_purchase_token?: string | null
}

const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions'
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions'

export function BillingTab() {
  const androidShell = useAndroidShell()
  const { user } = useAuth()
  const { settings } = useSettings()
  // The family's plan is the owner's: a co-parent sees it and isn't offered a
  // second subscription that would only unlock their own account.
  const familyId = settings?.user_id ?? user?.id ?? null
  const isOwner = !!user && familyId === user.id
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [upgradingPlan, setUpgradingPlan] = useState<PlanType | null>(null)

  useEffect(() => {
    if (user && familyId) {
      loadProfile()
    }
  }, [user, familyId])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', familyId!)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load billing information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (planType: PlanType) => {
    if (!user || !profile) {
      toast.error('Please log in to upgrade')
      return
    }

    setUpgradingPlan(planType)

    try {
      const checkoutUrl = await createCheckoutSession(planType)
      window.location.href = checkoutUrl
    } catch (error: any) {
      console.error('Upgrade error:', error)
      toast.error(error.message || 'Failed to start upgrade process. Please try again.')
      setUpgradingPlan(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const portalUrl = await createPortalSession()
      window.location.href = portalUrl
    } catch (error: any) {
      console.error('Portal error:', error)
      toast.error(error.message || 'Failed to open billing portal.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse min-h-[600px]">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-[500px] bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="h-[500px] bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="h-[500px] bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        </div>
      </div>
    )
  }

  const currentTier = profile?.subscription_type || 'free'
  const isPremium = checkPremium(currentTier)
  const billedBy: 'apple' | 'google' | 'stripe' = profile?.apple_original_transaction_id
    ? 'apple'
    : profile?.google_purchase_token
      ? 'google'
      : 'stripe'

  return (
    <div className="space-y-8 min-h-[600px]">
      {/* Current Plan Display */}
      <div
        className={`p-6 rounded-2xl border ${
          isPremium
            ? 'border-indigo-300 dark:border-indigo-700'
            : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20'
        }`}
        style={isPremium ? { background: 'var(--card-bg)' } : undefined}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isPremium ? (
                <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {isPremium ? 'Premium' : 'Free Plan'}
              </h3>
            </div>

            {currentTier === 'free' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                3 children • 20 chores • 3 store rewards • 1 goal per child
              </p>
            )}

            {currentTier === 'premium' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Active subscription • Unlimited children, chores, rewards & goals
              </p>
            )}

            {currentTier === 'lifetime' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Lifetime access • All premium features forever
              </p>
            )}

            {!isOwner && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Your family&apos;s plan is managed by the family owner{isPremium ? ', and you share all of it.' : '.'}
              </p>
            )}

            {isPremium && (
              <div className="flex flex-wrap gap-2 mt-4">
                {[
                  'Unlimited children & chores',
                  'Rotating & bonus chores',
                  'Routine template library',
                  'Weekly report email',
                  'Unlimited rewards & goals',
                  'Family sharing',
                  'Premium themes',
                  'Advanced analytics',
                  'Export reports',
                ].map((label) => (
                  <div key={label} className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inside the Android shell with Play Billing present, plans and
          management go through Google Play (prices from Play). */}
      {isOwner && androidShell && playBillingAvailable() && user && (
        <PlayBillingPlans
          userId={user.id}
          tier={currentTier}
          googleBilled={!!(profile as unknown as { google_purchase_token?: string | null })?.google_purchase_token}
          onPurchased={loadProfile}
        />
      )}

      {/* Upgrade Options (if free) — never inside the Android shell:
          Play policy forbids purchase CTAs that bypass Play Billing. */}
      {isOwner && currentTier === 'free' && !androidShell && (
        <>
          <div>
            <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Upgrade to Premium
            </h4>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Unlimited children and chores, chores that rotate between kids, bonus chores, more routine templates, unlimited store rewards and goals, family sharing, premium themes, analytics and export reports
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <PricingCard
              planType="monthly"
              onUpgrade={() => handleUpgrade('monthly')}
              isLoading={upgradingPlan === 'monthly'}
            />
            <PricingCard
              planType="annual"
              isPopular
              onUpgrade={() => handleUpgrade('annual')}
              isLoading={upgradingPlan === 'annual'}
            />
          </div>
        </>
      )}

      {/* Manage Subscription: wherever the family actually pays. Apple and
          Google subscriptions can only be changed in those stores; the Stripe
          portal is an external billing flow, so it hides in the Android shell. */}
      {isOwner && currentTier === 'premium' && !(androidShell && billedBy === 'stripe') && (
        <div>
          <h4 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Manage Subscription
          </h4>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {billedBy === 'apple'
                ? 'Your subscription is billed through the App Store. Change or cancel it in your Apple account, or on iPhone in Settings > your name > Subscriptions.'
                : billedBy === 'google'
                  ? 'Your subscription is billed through Google Play. Change or cancel it in your Play subscriptions.'
                  : 'View your billing history, update payment method, or cancel your subscription.'}
            </p>
            {billedBy === 'stripe' ? (
              <Button onClick={handleManageSubscription} variant="outline" className="font-semibold">
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Billing
              </Button>
            ) : (
              <Button asChild variant="outline" className="font-semibold">
                <a href={billedBy === 'apple' ? APPLE_SUBSCRIPTIONS_URL : PLAY_SUBSCRIPTIONS_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {billedBy === 'apple' ? 'Manage in the App Store' : 'Manage in Google Play'}
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <h4 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Need Help?
        </h4>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Questions about billing or subscriptions? Contact us at{' '}
          <a href="mailto:hi@chorestar.app" className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
            hi@chorestar.app
          </a>
        </p>
      </div>
    </div>
  )
}
