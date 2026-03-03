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

export const LATEST_CHANGELOG_VERSION = '2026.3.0'

export const CHANGELOG_DATA: Record<string, ChangelogEntry> = {
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
  '2025.1.15': {
    version: '2025.1.15',
    date: 'Late 2025',
    title: 'Performance & Accessibility',
    features: [
      {
        icon: '📊',
        title: 'Animated Dashboard Stats',
        description: 'Smooth animated counters for progress, streaks, and earnings make tracking more engaging!'
      },
      {
        icon: '⚡',
        title: 'Faster Load Times',
        description: 'Lazy loading optimizations reduce initial load time and improve performance.'
      },
      {
        icon: '⌨️',
        title: 'Enhanced Accessibility',
        description: 'Full keyboard navigation, focus traps, and improved screen reader support across all modals and dialogs.'
      },
      {
        icon: '📥',
        title: 'Export Options',
        description: 'Export chore history with per-child filtering and custom date ranges (PDF/CSV).'
      }
    ]
  },
  '2025.1.0': {
    version: '2025.1.0',
    date: 'Early 2025',
    title: 'Major Feature Update',
    features: [
      {
        icon: '📊',
        title: 'Weekly Summary Export',
        description: 'Export detailed weekly reports showing completion rates, earnings, and perfect days for each child.'
      },
      {
        icon: '📄',
        title: 'PDF Reports',
        description: 'Generate professional PDF reports of your family\'s chore progress.'
      },
      {
        icon: '🔄',
        title: 'Chore Reordering',
        description: 'Drag and drop to reorder chores for each child.'
      },
      {
        icon: '🎨',
        title: 'New Icon Picker',
        description: 'Choose from 50+ fun icons for chores!'
      }
    ]
  }
}
