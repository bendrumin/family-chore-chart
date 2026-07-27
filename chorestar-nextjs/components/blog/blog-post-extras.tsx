import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/constants/blog-posts'

const SITE_URL = 'https://chorestar.app'

/**
 * Per-post SEO + UX extras for blog articles:
 *  - BreadcrumbList JSON-LD (Home › Blog › this post)
 *  - a "Related articles" block (same-category first, then recent) to build
 *    internal links between posts and reduce crawl depth.
 * Drop `<BlogPostExtras slug="…" />` near the end of each post's content.
 */
export function BlogPostExtras({ slug }: { slug: string }) {
  const current = BLOG_POSTS.find((p) => p.slug === slug)
  if (!current) return null

  const others = BLOG_POSTS.filter((p) => p.slug !== slug)
  const sameCategory = others.filter((p) => p.category === current.category)
  const related = [
    ...sameCategory,
    ...others.filter((p) => p.category !== current.category),
  ].slice(0, 3)

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      {
        '@type': 'ListItem',
        position: 3,
        name: current.title,
        item: `${SITE_URL}/blog/${current.slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {related.length > 0 && (
        <aside className="mx-auto mt-12 max-w-3xl border-t border-gray-200 dark:border-gray-800 pt-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Related articles</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600"
              >
                <div className="mb-2 text-2xl" aria-hidden="true">{post.emoji}</div>
                <div className="text-sm font-semibold leading-snug text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {post.title}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{post.readTime}</div>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </>
  )
}
