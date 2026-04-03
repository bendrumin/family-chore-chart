import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accept Family Invite',
  description: 'Accept a ChoreStar family sharing invitation.',
  robots: { index: false, follow: false },
}

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return children
}
