export interface ChangelogFeature {
  icon: string
  title: string
  description: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  features: ChangelogFeature[]
}

export const LATEST_CHANGELOG_VERSION = '2026.3.1'

export const CHANGELOG_DATA: Record<string, ChangelogEntry> = {
  '2026.3.1': {
    version: '2026.3.1',
    date: 'March 2026',
    title: 'Smart Suggestions, Analytics & Polish',
    features: [
      {
        icon: '💡',
        title: 'Smart Chore Suggestions',
        description: 'Get age-appropriate, seasonal chore ideas tailored to each child. One tap to add them — no more blank-page brainstorming.'
      },
      {
        icon: '📈',
        title: 'Analytics Charts',
        description: 'New completion trend and per-child comparison charts on the Insights tab. See exactly how your family is doing week over week.'
      },
      {
        icon: '🖨️',
        title: 'Printable Weekly Templates',
        description: 'Download themed chore sheets (Stars, Rainbow, or Minimal) as PDFs. Great for sticking on the fridge.'
      },
      {
        icon: '📖',
        title: 'Redesigned How-To Guides',
        description: 'The tutorials page got a fresh timeline layout — cleaner, scannable, and easier to follow.'
      },
      {
        icon: '✨',
        title: 'UI & Brand Polish',
        description: 'Consistent brand gradient across all buttons, loading skeletons for charts, tighter iOS TestFlight copy, and cleaner page titles.'
      },
    ]
  },
  '2026.3.0': {
    version: '2026.3.0',
    date: 'March 2026',
    title: 'Per-Chore Rewards & Week Bonus',
    features: [
      {
        icon: '💰',
        title: 'Per-Chore Reward Mode',
        description: 'Switch to "Per Chore" mode in Settings → Family and set a unique reward amount on each chore. Earnings add up as kids complete them — bigger chores can be worth more.'
      },
      {
        icon: '🎉',
        title: 'Full Week Bonus Reward',
        description: 'Replace the old weekly bonus cents with a fun label — "pizza night," "movie night," "stay up late." When kids complete every chore every day, the label pops up as a celebration.'
      },
      {
        icon: '🏷️',
        title: 'Reward Amount on Chore Cards',
        description: 'Each chore card now shows its reward amount so kids always know exactly what they\'re working toward.'
      },
    ]
  },
  '2026.2.0': {
    version: '2026.2.0',
    date: 'February 2026',
    title: 'Family Sharing & Visual Overhaul',
    features: [
      {
        icon: '👨‍👩‍👧‍👦',
        title: 'Family Sharing (Multi-Parent)',
        description: 'Invite a co-parent or guardian via email. They get full access to manage children, chores, and routines — all synced in real time.'
      },
      {
        icon: '🎨',
        title: 'Seasonal Themes',
        description: 'The dashboard now dresses up for the season — Spring blossoms, Summer sunshine, Fall harvest, and Winter snowflakes. Automatically applied based on the time of year.'
      },
      {
        icon: '🔄',
        title: 'Daily Routines',
        description: 'Create morning, afternoon, and evening routines for each child. Routines reset daily and can include any mix of tasks.'
      },
      {
        icon: '✏️',
        title: 'Edit Family Name',
        description: 'Personalize your dashboard by setting your family name directly from Settings → Family.'
      },
      {
        icon: '🏠',
        title: 'Full Visual Consistency',
        description: 'Every page — login, signup, how-to guide, and more — now shares a unified look and feel with the main dashboard.'
      }
    ]
  },
  '2026.1.0': {
    version: '2026.1.0',
    date: 'January 2026',
    title: 'Kid Mode & Routines',
    features: [
      {
        icon: '🧒',
        title: 'Kid Mode',
        description: 'Kids can now log in on their own device using a family code — no email or password required. PIN-protected so only they can mark their own chores done.'
      },
      {
        icon: '📋',
        title: 'Chore Routines',
        description: 'Build repeating daily routines (morning, evening, etc.) that reset automatically. Perfect for consistent habits.'
      },
      {
        icon: '🌟',
        title: 'Seasonal Chore Suggestions',
        description: 'Get age-appropriate chore ideas based on the current season. One click to add them to any child\'s list.'
      },
      {
        icon: '📖',
        title: 'How-To Guide',
        description: 'New dedicated guide page walking through every feature — great for getting new family members up to speed quickly.'
      }
    ]
  },
}
