'use client'

import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { type PlanType } from '@/lib/utils/stripe'
import { useDisplayPrices } from '@/lib/hooks/use-display-prices'

interface PricingCardProps {
  planType: PlanType
  isPopular?: boolean
  onUpgrade: () => void
  isLoading?: boolean
}

// Only what Premium actually unlocks (docs/PREMIUM.md). Custom colors and
// seasonal themes are free, so they're not sold here.
const PLAN_FEATURES = {
  monthly: [
    'Unlimited children & chores',
    'Chores that rotate between kids',
    'Bonus chores: first to finish earns it',
    '10 more routine templates',
    'Weekly family report email',
    'Unlimited store rewards & goals',
    'Family sharing with a co-parent',
    '6 premium themes',
    'Advanced analytics',
    'Export reports (PDF/CSV)',
    'Priority support',
  ],
  annual: [
    'Everything in Monthly',
    'About 2 months free',
    'Unlimited children & chores',
    'Rotating & bonus chores',
    '10 more routine templates',
    'Unlimited store rewards & goals',
    'Family sharing with a co-parent',
    'Advanced analytics',
    'Export reports (PDF/CSV)',
  ],
}

const PLAN_TITLES = {
  monthly: 'Premium Monthly',
  annual: 'Premium Annual',
}

export function PricingCard({ planType, isPopular = false, onUpgrade, isLoading = false }: PricingCardProps) {
  const prices = useDisplayPrices()
  const savings = planType === 'annual' ? prices.annualSavings : null
  const features = PLAN_FEATURES[planType].map((f) =>
    f === 'Save $10 per year' && savings ? savings : f
  )
  const title = PLAN_TITLES[planType]
  const price = planType === 'monthly' ? prices.monthly : prices.annual

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all hover:shadow-lg ${
        isPopular
          ? 'border-indigo-300 dark:border-indigo-700 shadow-sm'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      style={{ background: 'var(--card-bg)' }}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-block px-4 py-1 text-sm font-bold rounded-full accent-fill">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-black" style={{ color: 'var(--primary)' }}>
            {price}
          </span>
        </div>
        {savings && (
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
            {savings}
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onUpgrade}
        disabled={isLoading}
        className="w-full font-bold text-lg"
        variant={isPopular ? 'gradient' : 'default'}
        size="lg"
      >
        {isLoading ? 'Processing...' : `Upgrade Now`}
      </Button>
    </div>
  )
}
