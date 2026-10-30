const APP_ID = '6761279049'

export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_ID}`

/**
 * Apple's provider token (pt=) for this developer account. It's public (it
 * sits in every campaign link) and never changes. Apple only issues it through
 * App Store Connect > Analytics > Acquisition > Campaigns > Generate Campaign
 * Link, not the API. Until it's filled in, links stay plain and untracked:
 * ct= alone records nothing.
 */
export const APP_STORE_PROVIDER_TOKEN = ''

/** Where a link sits. Few on purpose: Apple hides a campaign under 5 downloads. */
export type AppStoreCampaign = 'home' | 'blog' | 'dashboard' | 'printable' | 'email'

/** An App Store link that credits downloads to `campaign` in App Analytics. */
export function appStoreLink(campaign: AppStoreCampaign, providerToken: string = APP_STORE_PROVIDER_TOKEN): string {
  if (!providerToken) return APP_STORE_URL
  return `https://apps.apple.com/app/apple-store/id${APP_ID}?pt=${providerToken}&ct=${campaign}&mt=8`
}
