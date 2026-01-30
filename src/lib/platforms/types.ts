// Re-export Platform from media/platform-data.ts to maintain compatibility
export type { Platform } from '@/lib/media/platform-data';

// 流媒体平台类型定义（用于其他功能）
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