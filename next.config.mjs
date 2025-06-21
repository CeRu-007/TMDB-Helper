/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  rewrites: async () => {
    return [
      {
        source: '/api/csv/read',
        destination: '/api/csv/read',
      },
      {
        source: '/api/csv/save',
        destination: '/api/csv/save',
      },
      {
        source: '/api/csv/verify',
        destination: '/api/csv/verify',
      },
    ];
  },
}

export default nextConfig
