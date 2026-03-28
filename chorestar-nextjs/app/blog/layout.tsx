import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | ChoreStar Blog',
    default: 'Blog | ChoreStar',
  },
  description: 'Practical tips for parents on chore charts, morning routines, allowance systems, and raising responsible kids.',
  keywords: [
    'parenting tips',
    'chore chart ideas',
    'kids morning routine',
    'chore app for kids',
    'allowance tracker',
    'gamify chores',
    'age-appropriate chores',
    'family organization',
  ],
  openGraph: {
    title: 'ChoreStar Blog',
    description: 'Practical tips for parents on chore charts, morning routines, allowance systems, and raising responsible kids.',
    url: 'https://chorestar.app/blog',
    siteName: 'ChoreStar',
  },
  twitter: {
    card: 'summary',
    title: 'ChoreStar Blog',
    description: 'Practical tips for parents on chore charts, routines, and raising responsible kids.',
  },
  alternates: {
    canonical: 'https://chorestar.app/blog',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
