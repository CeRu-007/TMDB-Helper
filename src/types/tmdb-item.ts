import type { BaseMediaInfo, Episode, Season } from './media/base'

// 重新导出 Episode 和 Season 以保持向后兼容
export type { Episode, Season }

/**
 * TMDB 网络信息
 */
export interface TMDBNetwork {
  id: number
  name: string
  logoPath?: string
  logoUrl?: string
}

/**
 * TMDBItem - 用户跟踪的媒体项目
 * 继承基础媒体信息，添加业务相关字段
 */
export interface TMDBItem extends BaseMediaInfo {
  // 媒体类型固定为 tv（当前只支持电视剧）
  mediaType: 'tv'
  
  // 业务相关字段
  platformUrls?: string[]
  defaultPlatformUrl?: string
  networks?: TMDBNetwork[]
  totalEpisodes?: number
  manuallySetEpisodes?: boolean
  episodes?: Episode[]
  seasons?: Season[]
  
  // 日程相关
  weekday?: number
  secondWeekday?: number
  airTime?: string
  category?: string
  tmdbUrl?: string
  notes?: string
  isDailyUpdate?: boolean
  
  // 显示设置
  blurIntensity?: 'light' | 'medium' | 'heavy'
  rating?: number
} 