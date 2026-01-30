// 统一导出平台相关的所有类型和工具函数
export * from './types'
export * from './utils'

// 导出常量数据
export { platforms, categories, getFilteredPlatforms, getPopularPlatforms, getPlatformsByRegion } from '@/lib/media/platform-data'
export { streamingPlatforms } from '@/lib/media/streaming-platforms'
