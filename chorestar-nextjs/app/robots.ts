import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/manifest.json', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/dashboard', '/kid/', '/kid-login', '/family/'],
      },
    ],
    sitemap: 'https://chorestar.app/sitemap.xml',
  }
}
