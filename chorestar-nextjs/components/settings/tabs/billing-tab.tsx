'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CreditCard, Crown, CheckCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { PricingCard } from '@/components/payment/pricing-card'
import { createCheckoutSession, createPortalSession, type PlanType } from '@/lib/utils/stripe'
import { toast } from 'sonner'
import { isPremium as checkPremium } from '@/lib/utils/subscription'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function BillingTab() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [upgradingPlan, setUpgradingPlan] = useState<PlanType | null>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
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
        <div className="h-40 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-2xl" />
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

  return (
    <div className="space-y-8 min-h-[600px]">
      {/* Current Plan Display */}
      <div className={`p-6 rounded-2xl border-2 ${
        isPremium
          ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:border-purple-700 dark:from-purple-900/30 dark:to-pink-900/30'
          : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isPremium ? (
                <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {isPremium ? '⭐ Premium' : 'Free Plan'}
              </h3>
            </div>

            {currentTier === 'free' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                3 children • 20 chores • Basic features
              </p>
            )}

            {currentTier === 'premium' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Active subscription • Unlimited children & chores
              </p>
            )}

            {currentTier === 'lifetime' && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Lifetime access • All premium features forever
              </p>
            )}

            {isPremium && (
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Unlimited children</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Unlimited chores</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Export reports</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Options (if free) */}
      {currentTier === 'free' && (
        <>
          <div>
            <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Upgrade to Premium
            </h4>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Unlock unlimited children, chores, and all premium features
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
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
            <PricingCard
              planType="lifetime"
              onUpgrade={() => handleUpgrade('lifetime')}
              isLoading={upgradingPlan === 'lifetime'}
            />
          </div>
        </>
      )}

      {/* Manage Subscription (if premium monthly/annual) */}
      {currentTier === 'premium' && (
        <div>
          <h4 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Manage Subscription
          </h4>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              View your billing history, update payment method, or cancel your subscription.
            </p>
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              className="font-semibold"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
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
          <a href="mailto:support@chorestar.app" className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
            support@chorestar.app
          </a>
        </p>
      </div>
    </div>
  )
}
