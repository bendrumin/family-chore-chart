import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How-To Guides — ChoreStar Tips & Tutorials',
  description: 'Step-by-step guides for getting the most out of ChoreStar. Learn how to add children, set up routines, use kid login with PIN, and more.',
  keywords: [
    'ChoreStar tutorial',
    'chore chart setup',
    'kids chore app guide',
    'family chore tracker tips',
    'how to use ChoreStar',
  ],
  openGraph: {
    title: 'How-To Guides — ChoreStar Tips & Tutorials',
    description: 'Step-by-step guides for setting up and using ChoreStar with your family.',
    url: 'https://chorestar.app/how-to',
  },
  twitter: {
    card: 'summary',
    title: 'How-To Guides — ChoreStar Tips & Tutorials',
    description: 'Step-by-step guides for setting up and using ChoreStar with your family.',
  },
  alternates: { canonical: 'https://chorestar.app/how-to' },
}

export default function HowToLayout({ children }: { children: React.ReactNode }) {
  return children
}
