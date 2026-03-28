import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How-To Guides & Tutorials',
  description: 'Step-by-step guides for getting the most out of ChoreStar. Learn how to add children, set up routines, use kid login with PIN, and more.',
  keywords: [
    'ChoreStar tutorial',
    'chore chart setup',
    'kids chore app guide',
    'family chore tracker tips',
    'how to use ChoreStar',
  ],
  openGraph: {
    title: 'How-To Guides & Tutorials | ChoreStar',
    description: 'Step-by-step guides for setting up and using ChoreStar with your family.',
    url: 'https://chorestar.app/how-to',
  },
  twitter: {
    card: 'summary',
    title: 'How-To Guides & Tutorials | ChoreStar',
    description: 'Step-by-step guides for setting up and using ChoreStar with your family.',
  },
  alternates: { canonical: 'https://chorestar.app/how-to' },
}

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'ChoreStar How-To Guides',
  description: 'Step-by-step guides for setting up and using ChoreStar with your family.',
  url: 'https://chorestar.app/how-to',
  numberOfItems: 5,
  itemListElement: [
    {
      '@type': 'HowTo',
      position: 1,
      name: 'Adding Your First Child',
      description: 'Ready to get your family set up? Adding a child to ChoreStar takes less than two minutes.',
      url: 'https://chorestar.app/how-to#add-child',
      step: [
        { '@type': 'HowToStep', position: 1, text: 'From your dashboard, tap Add Child.' },
        { '@type': 'HowToStep', position: 2, text: "Enter your child's name and age." },
        { '@type': 'HowToStep', position: 3, text: 'Hit Randomize to generate a random robot avatar — keep hitting it until something clicks!' },
        { '@type': 'HowToStep', position: 4, text: 'Tap Add Child to save.' },
        { '@type': 'HowToStep', position: 5, text: "Find your child's card and tap Edit to choose a background color or a specific robot style." },
      ],
    },
    {
      '@type': 'HowTo',
      position: 2,
      name: 'Creating a Morning Routine',
      description: "ChoreStar's routines help you build structured step-by-step morning routines for your kids.",
      url: 'https://chorestar.app/how-to#create-routine',
      step: [
        { '@type': 'HowToStep', position: 1, text: 'From your dashboard, tap the Routines tab, then Add Routine.' },
        { '@type': 'HowToStep', position: 2, text: 'Select the Morning Routine template.' },
        { '@type': 'HowToStep', position: 3, text: 'Review the pre-loaded steps: Wake up, Brush teeth, Get dressed, Make bed, Eat breakfast, Pack backpack.' },
        { '@type': 'HowToStep', position: 4, text: "Add, remove, or rename steps to match your family's actual morning." },
        { '@type': 'HowToStep', position: 5, text: "Tap Create Routine — it's now ready to assign to your kids." },
      ],
    },
    {
      '@type': 'HowTo',
      position: 3,
      name: 'Kid Login Setup',
      description: "ChoreStar's Kid Zone lets kids access their routines independently — no email or password needed.",
      url: 'https://chorestar.app/how-to#kid-login',
      step: [
        { '@type': 'HowToStep', position: 1, text: 'Tap the Settings gear icon, then go to the Family tab.' },
        { '@type': 'HowToStep', position: 2, text: 'Copy your Kid Login Link — this is the unique URL for your family.' },
        { '@type': 'HowToStep', position: 3, text: 'Set a 4-digit PIN for each child.' },
        { '@type': 'HowToStep', position: 4, text: 'Share the link with your kid: bookmark it on the family tablet, text it to their phone, or make it a home screen shortcut.' },
        { '@type': 'HowToStep', position: 5, text: 'When they visit the link and enter their PIN, they land directly in their ChoreStar.' },
      ],
    },
    {
      '@type': 'HowTo',
      position: 4,
      name: "Running a Routine (Kid's Perspective)",
      description: "Here's the full flow of running a routine from a child's perspective.",
      url: 'https://chorestar.app/how-to#run-routine',
      step: [
        { '@type': 'HowToStep', position: 1, text: 'Kid visits the Kid Login Link and enters their 4-digit PIN.' },
        { '@type': 'HowToStep', position: 2, text: 'They see their routine cards with a big, friendly Start button.' },
        { '@type': 'HowToStep', position: 3, text: 'Tapping Start begins the routine — one step shown at a time.' },
        { '@type': 'HowToStep', position: 4, text: 'Each step shows clearly on screen; when done, they tap to move to the next.' },
        { '@type': 'HowToStep', position: 5, text: 'After the last step — confetti! A celebration screen rewards the effort.' },
      ],
    },
    {
      '@type': 'HowTo',
      position: 5,
      name: 'Family Settings & the Share Link',
      description: 'The Family Settings section is your command center for keeping everything organized.',
      url: 'https://chorestar.app/how-to#family-settings',
      step: [
        { '@type': 'HowToStep', position: 1, text: 'Tap the Settings gear icon from anywhere in the app.' },
        { '@type': 'HowToStep', position: 2, text: 'Select the Family tab to find your Kid Login Link.' },
        { '@type': 'HowToStep', position: 3, text: 'Tap Copy to grab the link anytime you need to re-share it.' },
        { '@type': 'HowToStep', position: 4, text: "Tap Open Editor to manage children's profiles and set or update their PINs." },
        { '@type': 'HowToStep', position: 5, text: 'Update a PIN anytime if your child forgets it.' },
      ],
    },
  ],
}

export default function HowToLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      {children}
    </>
  )
}
