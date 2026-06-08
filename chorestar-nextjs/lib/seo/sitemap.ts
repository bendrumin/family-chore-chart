import { BLOG_POSTS } from '@/lib/constants/blog-posts'

export type SitemapChangeFrequency = 'weekly' | 'monthly' | 'yearly'

export interface SitemapEntry {
  path: string
  lastModified: string
  changeFrequency: SitemapChangeFrequency
  priority: string
}

function latestBlogDate(): string {
  return BLOG_POSTS[0]?.isoDate ?? new Date().toISOString().slice(0, 10)
}

/** All public indexable URLs — blog posts are included automatically from BLOG_POSTS */
export function getSitemapEntries(): SitemapEntry[] {
  const fresh = latestBlogDate()

  const staticRoutes: SitemapEntry[] = [
    { path: '', lastModified: fresh, changeFrequency: 'weekly', priority: '1.0' },
    { path: '/signup', lastModified: fresh, changeFrequency: 'monthly', priority: '0.9' },
    { path: '/how-to', lastModified: fresh, changeFrequency: 'weekly', priority: '0.8' },
    { path: '/blog', lastModified: fresh, changeFrequency: 'weekly', priority: '0.8' },
    { path: '/partners', lastModified: '2026-05-16', changeFrequency: 'monthly', priority: '0.6' },
    { path: '/privacy', lastModified: '2026-03-28', changeFrequency: 'yearly', priority: '0.3' },
  ]

  const blogRoutes: SitemapEntry[] = BLOG_POSTS.map((post) => ({
    path: `/blog/${post.slug}`,
    lastModified: post.isoDate,
    changeFrequency: 'monthly' as const,
    priority: '0.7',
  }))

  return [...staticRoutes, ...blogRoutes]
}
