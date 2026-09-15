import { BLOG_POSTS } from '@/lib/constants/blog-posts'

const SITE = 'https://chorestar.app'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/** RSS 2.0 feed for the blog, driven by the same registry as the sitemap. */
export function GET() {
  const items = BLOG_POSTS.map((post) =>
    [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${SITE}/blog/${post.slug}</link>`,
      `      <guid isPermaLink="true">${SITE}/blog/${post.slug}</guid>`,
      `      <description>${escapeXml(post.description)}</description>`,
      `      <pubDate>${new Date(`${post.isoDate}T12:00:00Z`).toUTCString()}</pubDate>`,
      `      <category>${escapeXml(post.category)}</category>`,
      '    </item>',
    ].join('\n')
  ).join('\n')

  const feed = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>ChoreStar Blog</title>',
    `    <link>${SITE}/blog</link>`,
    '    <description>Chore lists by age, routine guides, allowance ideas, and ChoreStar product news.</description>',
    '    <language>en-us</language>',
    `    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>`,
    `    <lastBuildDate>${new Date(`${BLOG_POSTS[0].isoDate}T12:00:00Z`).toUTCString()}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n')

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
