/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
  
  compress: false,
  
  // 开发环境快速启动优化
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // 启用 App Router 优化
  serverExternalPackages: ['sharp', 'canvas'],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    unoptimized: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
    ],
  },
  
  // 移除 webpack 配置，使用 Turbopack
  // 添加空的 turbopack 配置以修复构建错误
  turbopack: {},
  
  // 编译器配置
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    emotion: true,
  },
}

export default nextConfig