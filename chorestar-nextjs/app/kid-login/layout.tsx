import { Metadata } from 'next'
import { KidDirection } from '@/components/kid/kid-direction'

export const metadata: Metadata = {
  title: 'Kid Login',
  description: 'Log in to ChoreStar kid mode with your family code and PIN.',
  robots: { index: false, follow: false },
}

export default function KidLoginLayout({ children }: { children: React.ReactNode }) {
  // Flips to dir="rtl" after hydration when the kid locale is Arabic.
  return <KidDirection>{children}</KidDirection>
}
