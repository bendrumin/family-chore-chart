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

export const LATEST_CHANGELOG_VERSION = '2026.9.0'

export const CHANGELOG_DATA: Record<string, ChangelogEntry> = {
  '2026.9.0': {
    version: '2026.9.0',
    date: 'September 2026',
    title: 'Chores on Their Own Days',
    features: [
      {
        icon: '📅',
        title: 'Pick the Days a Chore Is Due',
        description: 'Trash on Tuesdays. Piano on Mon, Wed, Fri. Every chore now has a schedule: tap the days in the chore editor, or use Every day, Weekdays, or Weekends. The day checklist, the kid dashboard, the week grid, and the printable charts only show what is actually due.',
      },
      {
        icon: '⭐',
        title: 'Perfect Days That Are Fair',
        description: 'A perfect day means every chore due that day is done. Days with nothing due are skipped, so they never break a streak or cost the week bonus. Off days show as dashed cells in the grid, and you can still tick one to credit work done early or late.',
      },
    ],
  },
  '2026.8.3': {
    version: '2026.8.3',
    date: 'August 2026',
    title: 'Home That Feels Like the App',
    features: [
      {
        icon: '🏠',
        title: "Today's Chores, by Kid",
        description: 'The Everyone view is now a day checklist like the iPhone app. One tap to mark today done. Chores stay grouped under each child so siblings never get mixed up, and you can switch between 1, 2, or 3 columns on wider screens. Tap a child for the full week grid and routines.',
      },
      {
        icon: '🎨',
        title: 'Themes Match Across Web & App',
        description: 'Seasonal and accent colors now use the same palettes as iOS, with soft gradients and white text on the header and hero, contrast-checked so everything stays readable, even on bright summer colors.',
      },
      {
        icon: '✨',
        title: 'A Calmer Dashboard',
        description: 'Cards and buttons dropped the heavy glass and hover bounce. You get quiet surfaces, a soft theme glow in the background, and light seasonal particles on the hero instead of sticker clutter.',
      },
    ],
  },
  '2026.8.2': {
    version: '2026.8.2',
    date: 'August 2026',
    title: 'ChoreStar is on the App Store! 🎉',
    features: [
      {
        icon: '📱',
        title: 'The iPhone & iPad App Is Live',
        description: 'After months in the making, the fully native ChoreStar app is out of beta and on the App Store, including home screen widgets, kid mode with PIN login, step-by-step routine timers in the Dynamic Island, seasonal themes, and confetti celebrations. Your same family account works everywhere: set up chores on the web, and the kids can check them off from the iPad. Search "ChoreStar" on the App Store or grab it from the link on the home page.',
      },
    ],
  },
  '2026.8.1': {
    version: '2026.8.1',
    date: 'August 2026',
    title: 'Four Seasons, Four Palettes',
    features: [
      {
        icon: '🌸',
        title: 'Spring, Summer, Fall & Winter Got Repainted',
        description: 'Each season now uses a palette drawn from a real photograph (cherry blossom, flamingos at the water\'s edge, autumn maple, a frozen valley). They pair two colors instead of one, so the soft background glow picks up a second shade: pink blossom against a powder-blue sky, blush against deep teal. Pick a season any time of year under Settings › Appearance.',
      },
    ],
  },
  '2026.8.0': {
    version: '2026.8.0',
    date: 'August 2026',
    title: 'Your Colors, Your Account',
    features: [
      {
        icon: '🎨',
        title: 'Pick Any Accent Color',
        description: 'Settings › Appearance now has a full color picker. Whatever you choose recolors the whole dashboard (header, buttons, progress ring, and the day checkboxes on every chore). Seasonal themes each bring their own color too, and every one is contrast-checked so text stays readable.',
      },
      {
        icon: '⚙️',
        title: 'New Account Tab',
        description: 'Your sign-in email and account controls now live together under Settings › Account, including the option to permanently delete your account and all of your family\'s data, if you ever want to.',
      },
    ],
  },
  '2026.7.0': {
    version: '2026.7.0',
    date: 'July 2026',
    title: 'Smarter Chore Suggestions',
    features: [
      {
        icon: '✨',
        title: 'AI-Powered Suggestions',
        description: 'Smart Chore Suggestions now use AI to tailor ideas to each child (their age, the chores they already have, how they\'ve been doing lately, and the time of year). Open Smart Suggestions and look for the "AI-personalized" badge.',
      },
      {
        icon: '🎯',
        title: 'Personal, and Always Instant',
        description: 'Ideas come back in a tap, and if the AI is ever unavailable we fall back to our built-in suggestions automatically, so you never wait and never hit a dead end.',
      },
    ],
  },
  '2026.6.1': {
    version: '2026.6.1',
    date: 'June 2026',
    title: 'Summer Guides & Polish',
    features: [
      {
        icon: '🏫',
        title: "School's Out: Now What?",
        description: 'New blog guide for the first two weeks of summer break: sleep, screens, daily rhythm, and when to add chores, without overscheduling.',
      },
      {
        icon: '🌙',
        title: 'Consistent Dark Mode',
        description: 'Your light/dark/auto theme preference now follows you across the dashboard, homepage, and login. No more flipping between modes.',
      },
    ],
  },
  '2026.6.0': {
    version: '2026.6.0',
    date: 'June 2026',
    title: 'Summer Chores & Sunny Themes',
    features: [
      {
        icon: '☀️',
        title: 'Summer Chore Suggestions',
        description: 'Smart Suggestions now boost outdoor summer jobs (watering plants, washing the car, BBQ prep, pool cleanup, mowing, and more), age-filtered for each child.'
      },
      {
        icon: '🏖️',
        title: 'Summer Theme',
        description: 'The sunny Summer theme is live in Settings → Appearance. Turn on Auto-Seasonal and your dashboard picks it up automatically through August.'
      },
    ]
  },
  '2026.5.0': {
    version: '2026.5.0',
    date: 'May 2026',
    title: 'Spring Cleanup Chore Ideas',
    features: [
      {
        icon: '🌎',
        title: 'New Spring & Earth Day Suggestions',
        description: 'Smart Suggestions now include outdoor cleanup ideas like dog poop cleanup, litter pickup, weed pulling, planting flowers, patio sweeping, bird feeder refills, and trash bin washing.'
      },
      {
        icon: '🌷',
        title: 'More Yard Work for Kids',
        description: 'Spring chores are age-filtered and seasonally boosted so families see helpful yard work ideas right when the weather turns.'
      },
    ]
  },
  '2026.3.1': {
    version: '2026.3.1',
    date: 'March 2026',
    title: 'Smart Suggestions, Analytics & Polish',
    features: [
      {
        icon: '💡',
        title: 'Smart Chore Suggestions',
        description: 'Get age-appropriate, seasonal chore ideas tailored to each child. One tap to add them. No more blank-page brainstorming.'
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
        description: 'The tutorials page got a fresh timeline layout, cleaner, scannable, and easier to follow.'
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
        description: 'Switch to "Per Chore" mode in Settings → Family and set a unique reward amount on each chore. Earnings add up as kids complete them. Bigger chores can be worth more.'
      },
      {
        icon: '🎉',
        title: 'Full Week Bonus Reward',
        description: 'Replace the old weekly bonus cents with a fun label ("pizza night," "movie night," "stay up late"). When kids complete every chore every day, the label pops up as a celebration.'
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
        description: 'Invite a co-parent or guardian via email. They get full access to manage children, chores, and routines, all synced in real time.'
      },
      {
        icon: '🎨',
        title: 'Seasonal Themes',
        description: 'The dashboard now dresses up for the season (Spring blossoms, Summer sunshine, Fall harvest, and Winter snowflakes). Automatically applied based on the time of year.'
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
        description: 'Every page (login, signup, how-to guide, and more) now shares a unified look and feel with the main dashboard.'
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
        description: 'Kids can now log in on their own device using a family code, no email or password required. PIN-protected so only they can mark their own chores done.'
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
        description: 'New dedicated guide page walking through every feature, great for getting new family members up to speed quickly.'
      }
    ]
  },
}
