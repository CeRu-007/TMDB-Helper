// 统一导出平台相关的所有类型和工具函数
export * from './types'
export * from './utils'

// 导出常量数据
export { streamingPlatforms, platformCategories } from '@/features/image-processing/lib/streaming-platforms'
export { streamingPlatformsNav, platformCategories as navCategories } from '@/features/image-processing/lib/platform-navigation'
