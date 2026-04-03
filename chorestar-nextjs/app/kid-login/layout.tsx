import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kid Login',
  description: 'Log in to ChoreStar kid mode with your family code and PIN.',
  robots: { index: false, follow: false },
}

export default function KidLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
