'use client'

import { useDisplayPrices } from '@/lib/hooks/use-display-prices'

// The localized "from" price for upsell copy on server-rendered pages.
// Renders the USD price on the server and swaps to the regional price
// (MX/BR) after hydration, matching what Checkout will actually charge.
export function UpgradePriceLabel() {
  const prices = useDisplayPrices()
  return <>{prices.monthly}</>
}
