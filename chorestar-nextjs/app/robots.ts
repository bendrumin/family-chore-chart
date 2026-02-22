import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/manifest.json'],
        disallow: ['/api/', '/admin/', '/dashboard', '/kid/', '/kid-login'],
      },
    ],
    sitemap: 'https://chorestar.app/sitemap.xml',
  }
}
