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

  // 增强的 webpack 配置来处理 ChunkLoadError 和模块加载问题
  webpack: (config, { isServer, dev }) => {
    // 优化 chunk 分割，减少 ChunkLoadError
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // 将新增的乐观更新相关模块打包到一个 chunk 中
            optimisticUpdate: {
              name: 'optimistic-update',
              test: /[\\/]lib[\\/](operation-queue-manager|data-consistency-validator|abort-error-monitor|optimistic-update-manager)\.ts$/,
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            // 将 UI 组件打包到一个 chunk 中
            uiComponents: {
              name: 'ui-components',
              test: /[\\/]components[\\/]ui[\\/]/,
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // 在开发模式下添加更好的错误处理
    if (dev && !isServer) {
      config.devtool = 'eval-source-map';
    }

    // 添加模块解析优化
    config.resolve.alias = {
      ...config.resolve.alias,
      // 确保模块路径解析正确
      '@/lib': require('path').resolve('./lib'),
      '@/components': require('path').resolve('./components'),
    };

    return config;
  },

  // 添加构建优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 优化生产构建
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
  }),
}

export default nextConfig
