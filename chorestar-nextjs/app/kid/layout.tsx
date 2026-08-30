import type { Metadata } from 'next'
import { KidThemeLoader } from '@/components/kid/kid-theme'

// Kid-mode pages carry per-child URLs that can be shared outside the family.
// robots.txt already Disallows /kid/, but a Disallow alone lets externally
// linked URLs get indexed — the crawler never sees a noindex. Set it here.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Paints the family's theme onto every kid page (dashboard and routine
          player alike) and drifts the season's particles over it. */}
      <KidThemeLoader />
      {children}
    </>
  )
}
