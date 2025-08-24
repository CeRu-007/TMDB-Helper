/** @type {import('next').NextConfig} */
const nextConfig = {
  // 动态配置output，避免重复定义
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : 
          process.env.ELECTRON_BUILD === 'true' ? undefined :
          (process.env.NODE_ENV === 'production' && process.platform !== 'win32' ? 'standalone' : undefined),
  
  // 动态配置trailingSlash
  trailingSlash: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',

  // 禁用实验性功能以避免构建问题
  experimental: {},

  // Electron 环境下的特殊配置
  ...(process.env.ELECTRON_BUILD === 'true' && {
    assetPrefix: '',
    basePath: '',
    images: {
      unoptimized: true
    }
  }),

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: process.env.STATIC_EXPORT === 'true' || process.env.ELECTRON_BUILD === 'true',
    domains: ['image.tmdb.org'],
    formats: ['image/avif', 'image/webp'], // AVIF优先
    deviceSizes: [640, 828, 1200, 1920], // 减少设备尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256], // 减少图片尺寸
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
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
    // Electron 构建时使用简化配置
    if (process.env.ELECTRON_BUILD === 'true') {
      console.log('🖥️ 检测到 Electron 构建，使用简化配置');

      // 简化的优化配置，避免模块缺失问题
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      return config;
    }

    // Docker环境检测和优化
    const isDocker = process.env.DOCKER_CONTAINER === 'true' ||
                     process.env.NODE_ENV === 'production';

    if (isDocker) {
      console.log('🐳 检测到Docker环境，应用Docker优化配置');

      // Docker环境下的内存优化
      config.optimization = {
        ...config.optimization,
        // 减少内存使用
        minimize: true,
        // 启用更激进的代码分割
        splitChunks: {
          ...config.optimization.splitChunks,
          maxSize: 200000, // 200KB chunks for Docker
          minSize: 20000,  // 20KB minimum
        }
      };
    }
    // 优化 chunk 分割，减少 ChunkLoadError
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          chunks: 'all',
          maxSize: 150000, // 减少到150KB限制
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // 将数据管理相关模块打包到一个 chunk 中
            dataManagement: {
              name: 'data-management',
              test: /[\\/]lib[\\/](operation-queue-manager|data-consistency-validator|abort-error-monitor|secure-config-manager)\.ts$/,
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
            // TMDB相关模块
            tmdbServices: {
              name: 'tmdb-services',
              test: /[\\/]lib[\\/](tmdb|metadata-extractor|platform-data)\.ts$/,
              chunks: 'all',
              priority: 18,
              reuseExistingChunk: true,
            },
            // 第三方库优化
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
        // 只在生产模式下启用模块连接优化
        ...(process.env.NODE_ENV === 'production' && {
          usedExports: true,
          sideEffects: false,
        }),
      };
      
      // 只在生产模式下添加缓存配置
      if (process.env.NODE_ENV === 'production') {
        config.cache = {
          type: 'filesystem',
          buildDependencies: {
            config: [import.meta.url],
          },
        };
      }
    }

    // 不在开发模式下修改devtool，使用Next.js默认配置
    if (!dev && !isServer) {
      // 生产模式下使用更高效的source map
      config.devtool = 'source-map';
    }

    // Next.js 已经通过 tsconfig.json 处理路径别名，这里不需要额外配置

    return config;
  },

  // 添加构建优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    styledComponents: true, // 如果使用styled-components
  },

  // 优化生产构建
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
  }),

  // 性能优化
  modularizeImports: {
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}.js',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Electron 构建优化
  ...(process.env.ELECTRON_BUILD === 'true' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
    // 额外的性能优化
    modularizeImports: {
      // 优化lodash等库的导入
      'lodash': {
        transform: 'lodash/{{member}}',
      },
    },
    // 减少运行时开销
    reactStrictMode: false, // 生产环境禁用严格模式
  }),
}

export default nextConfig
