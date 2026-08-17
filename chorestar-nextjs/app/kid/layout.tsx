import type { Metadata } from 'next'

// Kid-mode pages carry per-child URLs that can be shared outside the family.
// robots.txt already Disallows /kid/, but a Disallow alone lets externally
// linked URLs get indexed — the crawler never sees a noindex. Set it here.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return children
}
