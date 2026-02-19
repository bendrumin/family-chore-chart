/**
 * PayPal Integration Utilities
 * Handles checkout creation and payment processing for ChoreStar subscriptions
 */

export type PlanType = 'monthly' | 'annual' | 'lifetime'

export interface PayPalCheckoutResponse {
  orderId: string
  approvalUrl: string
  planType: PlanType
  amount: string
}

export const PLAN_PRICES = {
  monthly: { amount: 4.99, label: 'Monthly' },
  annual: { amount: 49.99, label: 'Annual' },
  lifetime: { amount: 149.99, label: 'Lifetime' },
} as const

/**
 * Create a PayPal checkout session
 * @param planType - The subscription plan type
 * @param customerId - The user's ID
 * @param email - The user's email
 * @returns The PayPal checkout response with approval URL
 */
export async function createPayPalCheckout(
  planType: PlanType,
  customerId: string,
  email: string
): Promise<PayPalCheckoutResponse> {
  try {
    const response = await fetch('/api/create-paypal-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planType,
        customerId,
        email,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || 'Checkout creation failed')
    }

    const data: PayPalCheckoutResponse = await response.json()
    return data
  } catch (error) {
    console.error('PayPal checkout error:', error)
    throw error
  }
}

/**
 * Redirect user to PayPal for payment
 * @param planType - The subscription plan type
 * @param customerId - The user's ID
 * @param email - The user's email
 */
export async function initiatePayPalPayment(
  planType: PlanType,
  customerId: string,
  email: string
): Promise<void> {
  try {
    const checkout = await createPayPalCheckout(planType, customerId, email)

    // Redirect to PayPal
    window.location.href = checkout.approvalUrl
  } catch (error) {
    throw new Error('Failed to initiate payment. Please try again.')
  }
}

/**
 * Format plan price for display
 * @param planType - The subscription plan type
 * @returns Formatted price string (e.g., "$4.99/mo")
 */
export function formatPlanPrice(planType: PlanType): string {
  const plan = PLAN_PRICES[planType]
  if (planType === 'monthly') {
    return `$${plan.amount.toFixed(2)}/mo`
  } else if (planType === 'annual') {
    return `$${plan.amount.toFixed(2)}/yr`
  } else {
    return `$${plan.amount.toFixed(2)}`
  }
}

/**
 * Get plan savings compared to monthly
 * @param planType - The subscription plan type
 * @returns Savings message or null
 */
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
