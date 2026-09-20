/**
 * Google Play Billing, the pure half: product ids, the subscription-state
 * to tier mapping, and Pub/Sub push decoding. No network, fully tested.
 * The Android shell buys through Play; Play tells us about lifecycle
 * changes through Real-time Developer Notifications (Pub/Sub push) handled
 * by app/api/google/notifications, the same shape as the Apple endpoint.
 */

export const PLAY_PACKAGE_NAME = 'com.chorestar.app'

/** Subscription product ids in the Play Console (Monetize > Subscriptions). */
export const PLAY_PRODUCT_IDS = {
  monthly: 'chorestar_premium_monthly',
  yearly: 'chorestar_premium_yearly',
} as const

export const PLAY_SUBSCRIPTION_PRODUCT_IDS: readonly string[] = Object.values(PLAY_PRODUCT_IDS)

/** RTDN subscriptionNotification.notificationType values (Google's ints). */
export const PLAY_NOTIFICATION_TYPES: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
  19: 'SUBSCRIPTION_PRICE_CHANGE_UPDATED',
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED',
}

export function playNotificationName(type: number | undefined | null): string {
  if (type == null) return 'UNKNOWN'
  return PLAY_NOTIFICATION_TYPES[type] ?? `UNKNOWN_${type}`
}

/**
 * purchases.subscriptionsv2 `subscriptionState` -> what the profile should
 * say. CANCELED means "will not renew" and the family stays entitled until
 * expiry, exactly like Apple's DID_CHANGE_RENEWAL_STATUS. ON_HOLD (payment
 * failed, grace period over) and PAUSED remove access per Google's
 * guidance. PENDING and unknown states change nothing.
 */
export function tierForPlaySubscriptionState(state: string | undefined | null): 'premium' | 'free' | null {
  switch (state) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
    case 'SUBSCRIPTION_STATE_CANCELED':
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'premium'
    case 'SUBSCRIPTION_STATE_EXPIRED':
    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'free'
    default:
      return null
  }
}

export interface DeveloperNotification {
  version?: string
  packageName?: string
  eventTimeMillis?: string
  subscriptionNotification?: { version?: string; notificationType?: number; purchaseToken?: string; subscriptionId?: string }
  testNotification?: { version?: string }
  voidedPurchaseNotification?: { purchaseToken?: string; orderId?: string; productType?: number; refundType?: number }
  oneTimeProductNotification?: { version?: string; notificationType?: number; purchaseToken?: string; sku?: string }
}

/**
 * Pub/Sub push wraps the developer notification as base64 JSON in
 * message.data. Returns null for anything that is not a well-formed push.
 */
export function decodePubSubPush(body: unknown): DeveloperNotification | null {
  if (!body || typeof body !== 'object') return null
  const data = (body as { message?: { data?: unknown } }).message?.data
  if (typeof data !== 'string' || !data) return null
  try {
    const json = Buffer.from(data, 'base64').toString('utf8')
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? (parsed as DeveloperNotification) : null
  } catch {
    return null
  }
}

/** Constant-time-ish equality for the shared push token in the URL. */
export function pushTokenMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
