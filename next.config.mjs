/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STATIC_EXPORT === 'true' ? 'export' :
          process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
  
  compress: true,
  
  // 开发环境快速启动优化
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // 启用 App Router 优化
  serverExternalPackages: ['sharp', 'canvas'],
  
// TypeScript 配置：生产环境严格检查，开发环境宽松以避免编译阻塞
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
  
  // 添加 webpack 配置来处理 ChunkLoadError
  webpack: (config, { isServer }) => {
    // 优化代码块分割
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    }
    
    // 解决开发环境中的热重载问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    
    return config
  },
  
  // 编译器配置
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    emotion: true,
  },
}

export default nextConfig