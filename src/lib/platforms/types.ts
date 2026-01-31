// 流媒体平台类型定义
export interface StreamingPlatform {
  id: string
  name: string
  nameEn: string
  logo: string
  url: string
  description: string
  region: 'domestic' | 'international'
  category: 'comprehensive' | 'specialized'
  features: string[]
  color: string
}

// 平台导航数据结构定义
export interface Platform {
  id: string
  name: string
  category: string // 改为地区字符串
  description: string
  rating: number
  color: string // Tailwind渐变类名
  url: string
  region: string
  popular: boolean
  logo?: string // Logo URL
  fallbackEmoji: string // 默认emoji
}

// 平台定价信息
export interface PlatformPricing {
  monthly: number
  yearly: number
  currency: string
  hasFreeTier: boolean
  trialDays: number
}

// 完整的平台信息（包含用户相关数据）
export interface PlatformInfo {
  id: string
  name: string
  nameEn: string
  logo: string
  website: string
  description: string
  pricing: PlatformPricing
  subscriptionStatus: 'active' | 'inactive' | 'trial'
  categories: string[]
  regions: string[]
  features: string[]
  contentCount: number
  usageFrequency: 'high' | 'medium' | 'low'
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// 分类配置
export interface PlatformCategory {
  id: string
  label: string
  count: number
}

// 平台统计信息
export interface PlatformStats {
  total: number
  international: number
  domestic: number
  popular: number
  regions: Array<{
    region: string
    count: number
  }>
}