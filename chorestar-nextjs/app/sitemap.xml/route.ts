const baseUrl = 'https://chorestar.app'

const routes = [
  { path: '', changeFrequency: 'weekly', priority: '1.0' },
  { path: '/signup', changeFrequency: 'monthly', priority: '0.9' },
  { path: '/how-to', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/blog', changeFrequency: 'weekly', priority: '0.8' },
  { path: '/blog/schools-out-summer-plan', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/summer-chores-for-kids', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/spring-cleaning-chores-for-kids', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/morning-routine-for-kids', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/kids-chore-app-no-email', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/why-gamifying-chores-works', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/chore-reward-system-kids-money', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/blog/age-appropriate-chores-by-age', changeFrequency: 'monthly', priority: '0.7' },
  { path: '/partners', changeFrequency: 'monthly', priority: '0.6' },
  { path: '/privacy', changeFrequency: 'yearly', priority: '0.3' },
]

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function GET() {
  const lastModified = new Date().toISOString()
  const urlEntries = routes
    .map(({ path, changeFrequency, priority }) => {
      return [
        '  <url>',
        `    <loc>${escapeXml(`${baseUrl}${path}`)}</loc>`,
        `    <lastmod>${lastModified}</lastmod>`,
        `    <changefreq>${changeFrequency}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    '</urlset>',
  ].join('\n')

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  })
}
