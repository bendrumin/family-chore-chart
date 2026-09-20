'use client'

import { useEffect, useState } from 'react'
import { Crown, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PLAY_PACKAGE_NAME, PLAY_PRODUCT_IDS } from '@/lib/google/play-billing'
import {
  initPlayBilling, playPlans, buyPlayPlan, restorePlayPurchases, type PlayPlan,
} from '@/lib/utils/play-billing-client'

/**
 * The Billing tab's Google Play section, rendered only inside the Android
 * shell when cordova-plugin-purchase is present. Prices come from Play
 * (localized, PPP-aware), never from our copy. A purchase is verified by
 * /api/google/verify before the plugin finishes it; the bridge then fires
 * chorestar:play-purchase-verified and the tab reloads the profile.
 */
export function PlayBillingPlans({
  userId,
  tier,
  googleBilled,
  onPurchased,
}: {
  userId: string
  tier: string
  googleBilled: boolean
  onPurchased: () => void
}) {
  const [plans, setPlans] = useState<PlayPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<'monthly' | 'yearly' | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await initPlayBilling(userId)
        // Products arrive shortly after initialize; try a few times.
        for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
          const found = playPlans()
          if (found.length > 0) { setPlans(found); break }
          await new Promise((r) => setTimeout(r, 1200))
        }
      } catch (e) {
        console.error('Play Billing init failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const onVerified = () => { setBuying(null); toast.success('Premium is on. Thank you.'); onPurchased() }
    window.addEventListener('chorestar:play-purchase-verified', onVerified)
    return () => { cancelled = true; window.removeEventListener('chorestar:play-purchase-verified', onVerified) }
  }, [userId, onPurchased])

  const buy = async (key: 'monthly' | 'yearly') => {
    setBuying(key)
    try {
      await buyPlayPlan(key)
      // Approval, verification, and the success toast arrive via the event.
    } catch (e: unknown) {
      setBuying(null)
      toast.error(e instanceof Error ? e.message : 'Google Play could not start the purchase.')
    }
  }

  if (tier === 'premium' && googleBilled) {
    const manageUrl = `https://play.google.com/store/account/subscriptions?sku=${PLAY_PRODUCT_IDS.monthly}&package=${PLAY_PACKAGE_NAME}`
    return (
      <div>
        <h4 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Manage Subscription</h4>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Your subscription is billed by Google Play. Change the plan, update payment, or cancel there. Cancelling keeps Premium until the period ends.
          </p>
          <a href={manageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            Manage in Google Play <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  if (tier !== 'free') return null

  return (
    <div>
      <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Upgrade to Premium</h4>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Unlimited children, chores, store items, and goals. Family sharing, premium themes, export reports, and advanced analytics. Billed through Google Play.
      </p>
      {loading ? (
        <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : plans.length === 0 ? (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Google Play did not return the plans. Check your connection and reopen Billing.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div key={p.id} className={`p-5 rounded-2xl border-2 ${p.key === 'yearly' ? 'border-indigo-400 dark:border-indigo-600' : 'border-gray-200 dark:border-gray-700'}`} style={{ background: 'var(--card-bg)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{p.key === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                {p.key === 'yearly' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">Best value</span>}
              </div>
              <div className="text-2xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
                {p.price} <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>/ {p.period}</span>
              </div>
              <Button type="button" variant="gradient" size="lg" className="w-full font-bold" disabled={buying !== null} onClick={() => buy(p.key)}>
                {buying === p.key ? 'Opening Google Play...' : 'Subscribe'}
              </Button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={async () => { await restorePlayPurchases(); toast.info('Checked Google Play for an existing subscription.') }}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Restore a purchase
      </button>
    </div>
  )
}
