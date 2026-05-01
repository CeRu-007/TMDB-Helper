/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STATIC_EXPORT === 'true' ? 'export' :
          process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  trailingSlash: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
  
  compress: true,
  
  // 将 ELECTRON_BUILD 暴露给客户端
  env: {
    NEXT_PUBLIC_ELECTRON_BUILD: process.env.ELECTRON_BUILD || 'false',
  },
  
  // 开发环境快速启动优化
  experimental: {
    // 优化大型包的导入，减少编译时间
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'date-fns',
      'lodash-es',
    ],
    // 启用 turbo 模式（开发环境更快）
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
  },
  
  // 启用 App Router 优化
  serverExternalPackages: ['sharp', 'canvas'],
  
  // TypeScript 配置：生产环境严格检查，开发环境宽松以避免编译阻塞
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint 配置：构建时忽略 ESLint 错误
  eslint: {
    ignoreDuringBuilds: true,
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
  
  // Webpack 配置：处理客户端/服务端模块差异
  webpack: (config, { isServer, dev }) => {
    // 客户端禁用 Node.js 内置模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    
    if (dev) {
      config.optimization = {
        ...config.optimization,
        // 开发环境禁用最小化，加快构建速度
        minimize: false,
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
  
  // 禁用 source map 以减少 404 错误
  productionBrowserSourceMaps: false,
}

export default nextConfig