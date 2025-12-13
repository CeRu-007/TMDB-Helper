/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
  
  // 开发环境快速启动优化
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // 启用并行构建
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  
  // 开发环境优化
  devIndicators: {
    buildActivity: false, // 禁用构建活动指示器
  },
  
  // 减少编译开销
  swcMinify: true,
  
  // 启用 App Router 优化
  serverExternalPackages: ['sharp', 'canvas'],
  
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
  
  webpack: (config, { isServer, dev }) => {
    // 开发环境性能优化
    if (dev) {
      // 开发环境文件监听优化
      config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 200, // 减少到200ms
        poll: false
      }

      // 开发环境禁用压缩和优化
      if (isServer) {
        config.optimization.minimize = false
        config.optimization.concatenateModules = false
      }
      
      // 客户端也禁用一些优化
      if (!isServer) {
        config.optimization.minimize = false
        config.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
        }
      }
      
      // 减少解析开销
      config.resolve.symlinks = false
    }
    
    // 生产环境优化
    if (!dev) {
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    // 解决chunk加载问题
    if (!isServer) {
      config.output.publicPath = '/_next/';
    }
    
    return config;
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    // 开发环境也移除部分 console
    emotion: true,
  },
}

export default nextConfig