export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  isoDate: string
  readTime: string
  emoji: string
  category: string
}

/** Newest first — also drives sitemap lastmod order */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'schools-out-summer-plan',
    title: "School's Out — Now What? A Simple Summer Plan for the First Two Weeks",
    description:
      'Survive the first two weeks of summer break — sleep, screens, daily rhythm, and when to add chores without overscheduling.',
    date: 'June 8, 2026',
    isoDate: '2026-06-08',
    readTime: '6 min read',
    emoji: '🏫',
    category: 'Parenting',
  },
  {
    slug: 'summer-chores-for-kids',
    title: 'Summer Chores for Kids: Outdoor Jobs, Pool Prep & Screen-Time Swaps',
    description:
      'A practical summer chore list for kids — watering plants, washing the car, BBQ prep, and daily jobs that keep structure without killing summer fun.',
    date: 'June 7, 2026',
    isoDate: '2026-06-07',
    readTime: '7 min read',
    emoji: '☀️',
    category: 'Chores',
  },
  {
    slug: 'spring-cleaning-chores-for-kids',
    title: 'Spring Cleaning Chores for Kids: Yard Work, Earth Day Ideas & Cleanup Tasks',
    description:
      'A practical spring cleaning chore list for kids, including age-appropriate yard work, dog poop cleanup, litter pickup, gardening, and Earth Day cleanup ideas.',
    date: 'May 2, 2026',
    isoDate: '2026-05-02',
    readTime: '7 min read',
    emoji: '🌎',
    category: 'Chores',
  },
  {
    slug: 'morning-routine-for-kids',
    title: 'How to Build a Morning Routine for Kids That Actually Sticks',
    description:
      'A step-by-step guide to creating morning routines kids follow independently — with timers, progress tracking, and celebrations built in.',
    date: 'March 28, 2026',
    isoDate: '2026-03-28',
    readTime: '6 min read',
    emoji: '☀️',
    category: 'Routines',
  },
  {
    slug: 'kids-chore-app-no-email',
    title: 'How to Give Kids Their Own Chore App — No Email Required',
    description:
      "Most apps require an email to sign up. Here's how ChoreStar lets kids log in with just a family code and a 4-digit PIN.",
    date: 'March 28, 2026',
    isoDate: '2026-03-28',
    readTime: '5 min read',
    emoji: '🔑',
    category: 'Features',
  },
  {
    slug: 'why-gamifying-chores-works',
    title: 'Why Gamifying Chores Actually Works (And How ChoreStar Does It)',
    description:
      "Achievements, streaks, confetti, and progress bars aren't just fun — they tap into the same psychology that makes kids want to level up.",
    date: 'March 28, 2026',
    isoDate: '2026-03-28',
    readTime: '7 min read',
    emoji: '🎮',
    category: 'Parenting',
  },
  {
    slug: 'chore-reward-system-kids-money',
    title: 'Teaching Kids About Money With a Chore Reward System',
    description:
      'How to set up allowance tracking that teaches financial responsibility — from flat daily rates to per-chore rewards and weekly bonuses.',
    date: 'March 28, 2026',
    isoDate: '2026-03-28',
    readTime: '6 min read',
    emoji: '💰',
    category: 'Allowance',
  },
  {
    slug: 'age-appropriate-chores-by-age',
    title: 'Age-Appropriate Chores: What Kids Can Handle at Every Age',
    description:
      "A practical guide to matching chores with your child's age — from simple self-care at 3 to full household responsibilities at 15.",
    date: 'March 28, 2026',
    isoDate: '2026-03-28',
    readTime: '8 min read',
    emoji: '📋',
    category: 'Chores',
  },
]
