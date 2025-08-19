/**
 * 生产环境配置
 * 用于优化生产环境的性能和用户体验
 */

export const PRODUCTION_CONFIG = {
  // 性能优化配置
  performance: {
    // 图片懒加载
    enableImageLazyLoading: true,
    
    // 虚拟滚动阈值（超过此数量的项目启用虚拟滚动）
    virtualScrollThreshold: 100,
    
    // 防抖延迟（毫秒）
    debounceDelay: 300,
    
    // 节流延迟（毫秒）
    throttleDelay: 100,
    
    // 预加载图片数量
    preloadImageCount: 10,
  },

  // UI配置
  ui: {
    // 动画持续时间（毫秒）
    animationDuration: 300,
    
    // 是否启用高级动画效果
    enableAdvancedAnimations: true,
    
    // 是否启用毛玻璃效果
    enableGlassmorphism: true,
    
    // 默认网格变体
    defaultGridVariant: 'default' as 'default' | 'compact' | 'comfortable',
    
    // 是否显示性能指标
    showPerformanceMetrics: false,
  },

  // 响应式配置
  responsive: {
    // 断点配置
    breakpoints: {
      xs: 475,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
      '3xl': 1920,
    },
    
    // 每个断点的默认列数
    defaultColumns: {
      xs: 2,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
      '2xl': 6,
      '3xl': 7,
    },
    
    // 网格间距配置
    gridGaps: {
      xs: '0.75rem',
      sm: '1rem',
      md: '1.25rem',
      lg: '1.5rem',
      xl: '1.5rem',
      '2xl': '1.5rem',
      '3xl': '1.5rem',
    },
  },

  // 缓存配置
  cache: {
    // 图片缓存时间（毫秒）
    imageCacheTime: 24 * 60 * 60 * 1000, // 24小时
    
    // API缓存时间（毫秒）
    apiCacheTime: 5 * 60 * 1000, // 5分钟
    
    // 本地存储缓存键前缀
    cacheKeyPrefix: 'tmdb_helper_prod_',
  },

  // 错误处理配置
  errorHandling: {
    // 是否显示详细错误信息
    showDetailedErrors: false,
    
    // 错误重试次数
    maxRetries: 3,
    
    // 重试延迟（毫秒）
    retryDelay: 1000,
  },

  // 日志配置
  logging: {
    // 日志级别
    level: 'error' as 'debug' | 'info' | 'warn' | 'error',
    
    // 是否启用性能日志
    enablePerformanceLogs: false,
    
    // 是否启用用户行为追踪
    enableUserTracking: false,
  },
}

/**
 * 获取当前环境是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.ELECTRON_BUILD === 'true'
}

/**
 * 获取响应式配置
 */
export function getResponsiveConfig() {
  return PRODUCTION_CONFIG.responsive
}

/**
 * 获取性能配置
 */
export function getPerformanceConfig() {
  return PRODUCTION_CONFIG.performance
}

/**
 * 获取UI配置
 */
export function getUIConfig() {
  return PRODUCTION_CONFIG.ui
}

/**
 * 根据屏幕宽度获取推荐的列数
 */
export function getRecommendedColumns(screenWidth: number): number {
  const { breakpoints, defaultColumns } = PRODUCTION_CONFIG.responsive
  
  if (screenWidth >= breakpoints['3xl']) return defaultColumns['3xl']
  if (screenWidth >= breakpoints['2xl']) return defaultColumns['2xl']
  if (screenWidth >= breakpoints.xl) return defaultColumns.xl
  if (screenWidth >= breakpoints.lg) return defaultColumns.lg
  if (screenWidth >= breakpoints.md) return defaultColumns.md
  if (screenWidth >= breakpoints.sm) return defaultColumns.sm
  return defaultColumns.xs
}

/**
 * 根据屏幕宽度获取推荐的网格间距
 */
export function getRecommendedGap(screenWidth: number): string {
  const { breakpoints, gridGaps } = PRODUCTION_CONFIG.responsive
  
  if (screenWidth >= breakpoints['3xl']) return gridGaps['3xl']
  if (screenWidth >= breakpoints['2xl']) return gridGaps['2xl']
  if (screenWidth >= breakpoints.xl) return gridGaps.xl
  if (screenWidth >= breakpoints.lg) return gridGaps.lg
  if (screenWidth >= breakpoints.md) return gridGaps.md
  if (screenWidth >= breakpoints.sm) return gridGaps.sm
  return gridGaps.xs
}

export default PRODUCTION_CONFIG
