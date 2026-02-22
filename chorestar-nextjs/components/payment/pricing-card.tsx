'use client'

import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { type PlanType, formatPlanPrice, getPlanSavings } from '@/lib/utils/stripe'

interface PricingCardProps {
  planType: PlanType
  isPopular?: boolean
  onUpgrade: () => void
  isLoading?: boolean
}

const PLAN_FEATURES = {
  monthly: [
    'Unlimited children',
    'Unlimited chores',
    'Custom icons & colors',
    'Advanced analytics',
    'Export reports (PDF/CSV)',
    'Seasonal themes',
    'Priority support',
  ],
  annual: [
    'Everything in Monthly',
    'Save $10 per year',
    'Unlimited children',
    'Unlimited chores',
    'Custom icons & colors',
    'Advanced analytics',
    'Export reports (PDF/CSV)',
  ],
  lifetime: [
    'Everything forever!',
    'One-time payment',
    'No recurring fees',
    'Unlimited children',
    'Unlimited chores',
    'All premium features',
    'Lifetime updates',
  ],
}

const PLAN_TITLES = {
  monthly: 'Premium Monthly',
  annual: 'Premium Annual',
  lifetime: 'Lifetime Access',
}

export function PricingCard({ planType, isPopular = false, onUpgrade, isLoading = false }: PricingCardProps) {
  const features = PLAN_FEATURES[planType]
  const title = PLAN_TITLES[planType]
  const price = formatPlanPrice(planType)
  const savings = getPlanSavings(planType)

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
        isPopular
          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-block px-4 py-1 text-sm font-bold text-white rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
            ⭐ Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-black" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
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
        {isLoading ? '⏳ Processing...' : `Upgrade Now`}
      </Button>
    </div>
  )
}
