import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set base path for deployment at /app
  basePath: process.env.NODE_ENV === 'production' ? '/app' : '',
  // Ensure asset paths work correctly
  assetPrefix: process.env.NODE_ENV === 'production' ? '/app' : '',
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
