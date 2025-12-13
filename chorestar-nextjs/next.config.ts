import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Note: basePath is handled by Vercel routing via vercel.json rewrites
  // distDir is set to .next (default) - Vercel will find it in chorestar-nextjs/.next
  distDir: '.next',
  images: {
    domains: ['api.dicebear.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
