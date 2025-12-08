/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
  
  experimental: {},
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
    domains: ['image.tmdb.org'],
  },
  
  webpack: (config, { isServer }) => {
    return config;
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}

export default nextConfig