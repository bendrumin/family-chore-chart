import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Note: basePath is NOT used - routing is handled via vercel.json rewrites
  // DO NOT add basePath when using builds configuration in vercel.json
  distDir: '.next',
  // Set output file tracing root to parent directory (resolves lockfile warning)
  outputFileTracingRoot: path.join(__dirname, '..'),
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
