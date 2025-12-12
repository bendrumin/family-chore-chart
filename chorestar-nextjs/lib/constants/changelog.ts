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

export const CHANGELOG_DATA: Record<string, ChangelogEntry> = {
  '2025.1.15': {
    version: '2025.1.15',
    date: 'January 2025',
    title: 'Performance & UX Polish Update',
    features: [
      {
        icon: '📊',
        title: 'Animated Dashboard Stats',
        description: 'Smooth animated counters for progress, streaks, and earnings make tracking more engaging!'
      },
      {
        icon: '🛡️',
        title: 'Smart Error Handling',
        description: 'Friendly inline error messages with retry buttons for better user experience.'
      },
      {
        icon: '⚡',
        title: 'Faster Load Times',
        description: 'Lazy loading optimizations reduce initial load time and improve performance.'
      },
      {
        icon: '⌨️',
        title: 'Enhanced Accessibility',
        description: 'Full keyboard navigation, focus traps, and improved screen reader support.'
      },
      {
        icon: '📥',
        title: 'Advanced Export Options',
        description: 'Export with per-child filtering and custom date ranges (PDF/CSV).'
      },
      {
        icon: '🔍',
        title: 'SEO Optimized',
        description: 'Enhanced meta tags, structured data, and rich snippets for better discoverability.'
      }
    ]
  },
  '2025.1.0': {
    version: '2025.1.0',
    date: 'January 2025',
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
        icon: '📧',
        title: 'Enhanced Contact Support',
        description: 'Improved contact form with better email integration.'
      },
      {
        icon: '🎨',
        title: 'New Icon Picker',
        description: 'Choose from 50+ fun icons for chores!'
      }
    ]
  }
}

