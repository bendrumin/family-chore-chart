import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT_TEXT } from '@/lib/constants/brand'

interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  readTime: string
  emoji: string
  category: string
}

const posts: BlogPost[] = [
  {
    slug: 'morning-routine-for-kids',
    title: 'How to Build a Morning Routine for Kids That Actually Sticks',
    description: 'A step-by-step guide to creating morning routines kids follow independently — with timers, progress tracking, and celebrations built in.',
    date: 'March 28, 2026',
    readTime: '6 min read',
    emoji: '☀️',
    category: 'Routines',
  },
  {
    slug: 'kids-chore-app-no-email',
    title: 'How to Give Kids Their Own Chore App — No Email Required',
    description: 'Most apps require an email to sign up. Here\'s how ChoreStar lets kids log in with just a family code and a 4-digit PIN.',
    date: 'March 28, 2026',
    readTime: '5 min read',
    emoji: '🔑',
    category: 'Features',
  },
  {
    slug: 'why-gamifying-chores-works',
    title: 'Why Gamifying Chores Actually Works (And How ChoreStar Does It)',
    description: 'Achievements, streaks, confetti, and progress bars aren\'t just fun — they tap into the same psychology that makes kids want to level up.',
    date: 'March 28, 2026',
    readTime: '7 min read',
    emoji: '🎮',
    category: 'Parenting',
  },
  {
    slug: 'chore-reward-system-kids-money',
    title: 'Teaching Kids About Money With a Chore Reward System',
    description: 'How to set up allowance tracking that teaches financial responsibility — from flat daily rates to per-chore rewards and weekly bonuses.',
    date: 'March 28, 2026',
    readTime: '6 min read',
    emoji: '💰',
    category: 'Allowance',
  },
  {
    slug: 'age-appropriate-chores-by-age',
    title: 'Age-Appropriate Chores: What Kids Can Handle at Every Age',
    description: 'A practical guide to matching chores with your child\'s age — from simple self-care at 3 to full household responsibilities at 15.',
    date: 'March 28, 2026',
    readTime: '8 min read',
    emoji: '📋',
    category: 'Chores',
  },
]

const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'ChoreStar Blog',
  description: 'Practical tips for parents on chore charts, morning routines, allowance systems, and raising responsible kids.',
  url: 'https://chorestar.app/blog',
  publisher: {
    '@type': 'Organization',
    name: 'ChoreStar',
    url: 'https://chorestar.app',
  },
  blogPost: posts.map((post) => ({
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: `https://chorestar.app/blog/${post.slug}`,
    datePublished: '2026-03-28',
    author: { '@type': 'Organization', name: 'ChoreStar' },
  })),
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <main id="main-content" className="container mx-auto px-4 py-16 max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span style={GRADIENT_TEXT}>ChoreStar Blog</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Practical tips for parents on chore charts, routines, allowance, and raising kids who pitch in.
          </p>
        </header>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group"
            >
              <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700">
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0 mt-1">{post.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {post.date}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {post.readTime}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
