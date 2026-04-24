/**
 * MediaNews Store - 影视资讯状态管理
 * 管理即将上映和最近上映的影视资讯
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { MediaItem } from '@/types/media'

// MediaNews 状态接口
interface MediaNewsState {
  // 数据 - 按区域存储
  upcomingItemsByRegion: Record<string, MediaItem[]>
  recentItemsByRegion: Record<string, MediaItem[]>
  
  // 状态
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError: string | null
  recentError: string | null
  upcomingLastUpdated: Record<string, string>
  recentLastUpdated: Record<string, string>
  isMissingApiKey: boolean
  
  // 选择状态
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  
  // 操作
  setUpcomingItems: (items: MediaItem[], region: string) => void
  setRecentItems: (items: MediaItem[], region: string) => void
  setLoadingUpcoming: (loading: boolean) => void
  setLoadingRecent: (loading: boolean) => void
  setUpcomingError: (error: string | null) => void
  setRecentError: (error: string | null) => void
  setUpcomingLastUpdated: (time: string, region: string) => void
  setRecentLastUpdated: (time: string, region: string) => void
  setIsMissingApiKey: (missing: boolean) => void
  setSelectedRegion: (region: string) => void
  setMediaNewsType: (type: 'upcoming' | 'recent') => void
  
  // 重置
  reset: () => void
}

// 初始状态
const initialState = {
  upcomingItemsByRegion: {},
  recentItemsByRegion: {},
  loadingUpcoming: false,
  loadingRecent: false,
  upcomingError: null,
  recentError: null,
  upcomingLastUpdated: {},
  recentLastUpdated: {},
  isMissingApiKey: false,
  selectedRegion: 'CN',
  mediaNewsType: 'upcoming' as const,
}

// 创建 store
export const useMediaNewsStore = create<MediaNewsState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // 设置方法
      setUpcomingItems: (items, region) => set(
        (state) => ({
          upcomingItemsByRegion: { ...state.upcomingItemsByRegion, [region]: items }
        }),
        false,
        'setUpcomingItems'
      ),

      setRecentItems: (items, region) => set(
        (state) => ({
          recentItemsByRegion: { ...state.recentItemsByRegion, [region]: items }
        }),
        false,
        'setRecentItems'
      ),

      setLoadingUpcoming: (loadingUpcoming) => set(
        { loadingUpcoming },
        false,
        'setLoadingUpcoming'
      ),

      setLoadingRecent: (loadingRecent) => set(
        { loadingRecent },
        false,
        'setLoadingRecent'
      ),

      setUpcomingError: (upcomingError) => set(
        { upcomingError, loadingUpcoming: false },
        false,
        'setUpcomingError'
      ),

      setRecentError: (recentError) => set(
        { recentError, loadingRecent: false },
        false,
        'setRecentError'
      ),

      setUpcomingLastUpdated: (time, region) => set(
        (state) => ({
          upcomingLastUpdated: { ...state.upcomingLastUpdated, [region]: time }
        }),
        false,
        'setUpcomingLastUpdated'
      ),

      setRecentLastUpdated: (time, region) => set(
        (state) => ({
          recentLastUpdated: { ...state.recentLastUpdated, [region]: time }
        }),
        false,
        'setRecentLastUpdated'
      ),

      setIsMissingApiKey: (isMissingApiKey) => set(
        { isMissingApiKey },
        false,
        'setIsMissingApiKey'
      ),

      setSelectedRegion: (selectedRegion) => set(
        { selectedRegion },
        false,
        'setSelectedRegion'
      ),

      setMediaNewsType: (mediaNewsType) => set(
        { mediaNewsType },
        false,
        'setMediaNewsType'
      ),

      // 重置
      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'MediaNewsStore' }
  )
)

// 选择器 hooks - 使用函数参数获取指定区域的数据
export const useUpcomingItemsForRegion = (region: string) => 
  useMediaNewsStore((s) => s.upcomingItemsByRegion[region] || [])
export const useRecentItemsForRegion = (region: string) => 
  useMediaNewsStore((s) => s.recentItemsByRegion[region] || [])
export const useMediaNewsLoading = () => useMediaNewsStore((s) => ({
  loadingUpcoming: s.loadingUpcoming,
  loadingRecent: s.loadingRecent,
}))
export const useMediaNewsErrors = () => useMediaNewsStore((s) => ({
  upcomingError: s.upcomingError,
  recentError: s.recentError,
}))
export const useMediaNewsRegion = () => useMediaNewsStore((s) => ({
  selectedRegion: s.selectedRegion,
  mediaNewsType: s.mediaNewsType,
}))
