import Link from 'next/link'
import { SiteNav } from '@/components/layout/site-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { GRADIENT_TEXT } from '@/lib/constants/brand'
import { BLOG_POSTS as posts } from '@/lib/constants/blog-posts'

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
    datePublished: post.isoDate,
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
