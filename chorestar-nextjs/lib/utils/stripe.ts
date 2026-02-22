export type PlanType = 'monthly' | 'annual' | 'lifetime'

export const PLAN_PRICES = {
  monthly: { amount: 4.99, label: 'Monthly' },
  annual: { amount: 49.99, label: 'Annual' },
  lifetime: { amount: 149.99, label: 'Lifetime' },
} as const

export async function createCheckoutSession(planType: PlanType): Promise<string> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planType }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout session')
  }

  const { url } = await response.json()
  return url
}

export async function createPortalSession(): Promise<string> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to open billing portal')
  }

  const { url } = await response.json()
  return url
}

export function formatPlanPrice(planType: PlanType): string {
  const plan = PLAN_PRICES[planType]
  if (planType === 'monthly') {
    return `$${plan.amount.toFixed(2)}/mo`
  } else if (planType === 'annual') {
    return `$${plan.amount.toFixed(2)}/yr`
  }
  return `$${plan.amount.toFixed(2)}`
}

export function getPlanSavings(planType: PlanType): string | null {
  if (planType === 'annual') {
    const monthlyCost = PLAN_PRICES.monthly.amount * 12
    const savings = monthlyCost - PLAN_PRICES.annual.amount
    return `Save $${savings.toFixed(2)}/year`
  } else if (planType === 'lifetime') {
    return 'One-time payment'
  }
  return null
}
