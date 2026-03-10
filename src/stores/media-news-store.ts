/**
 * MediaNews Store - 影视资讯状态管理
 * 管理即将上映和最近上映的影视资讯
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { MediaItem } from '@/types/media'

// MediaNews 状态接口
interface MediaNewsState {
  // 数据
  upcomingItems: MediaItem[]
  recentItems: MediaItem[]
  upcomingItemsByRegion: Record<string, MediaItem[]>
  recentItemsByRegion: Record<string, MediaItem[]>
  
  // 状态
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError: string | null
  recentError: string | null
  upcomingLastUpdated: string | null
  recentLastUpdated: string | null
  isMissingApiKey: boolean
  
  // 选择状态
  selectedRegion: string
  mediaNewsType: 'upcoming' | 'recent'
  
  // 操作
  setUpcomingItems: (items: MediaItem[], region?: string) => void
  setRecentItems: (items: MediaItem[], region?: string) => void
  setLoadingUpcoming: (loading: boolean) => void
  setLoadingRecent: (loading: boolean) => void
  setUpcomingError: (error: string | null) => void
  setRecentError: (error: string | null) => void
  setUpcomingLastUpdated: (time: string | null) => void
  setRecentLastUpdated: (time: string | null) => void
  setIsMissingApiKey: (missing: boolean) => void
  setSelectedRegion: (region: string) => void
  setMediaNewsType: (type: 'upcoming' | 'recent') => void
  
  // 获取当前区域的数据
  getUpcomingItemsForRegion: (region: string) => MediaItem[]
  getRecentItemsForRegion: (region: string) => MediaItem[]
  
  // 重置
  reset: () => void
}

// 初始状态
const initialState = {
  upcomingItems: [],
  recentItems: [],
  upcomingItemsByRegion: {},
  recentItemsByRegion: {},
  loadingUpcoming: false,
  loadingRecent: false,
  upcomingError: null,
  recentError: null,
  upcomingLastUpdated: null,
  recentLastUpdated: null,
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
        (state) => {
          const newRegionCache = region
            ? { ...state.upcomingItemsByRegion, [region]: items }
            : state.upcomingItemsByRegion
          return {
            upcomingItems: items,
            upcomingItemsByRegion: newRegionCache,
            upcomingLastUpdated: new Date().toISOString(),
          }
        },
        false,
        'setUpcomingItems'
      ),
      
      setRecentItems: (items, region) => set(
        (state) => {
          const newRegionCache = region
            ? { ...state.recentItemsByRegion, [region]: items }
            : state.recentItemsByRegion
          return {
            recentItems: items,
            recentItemsByRegion: newRegionCache,
            recentLastUpdated: new Date().toISOString(),
          }
        },
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
      
      setUpcomingLastUpdated: (upcomingLastUpdated) => set(
        { upcomingLastUpdated },
        false,
        'setUpcomingLastUpdated'
      ),
      
      setRecentLastUpdated: (recentLastUpdated) => set(
        { recentLastUpdated },
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
      
      // 获取指定区域的数据
      getUpcomingItemsForRegion: (region) => {
        const state = get()
        return state.upcomingItemsByRegion[region] || state.upcomingItems
      },
      
      getRecentItemsForRegion: (region) => {
        const state = get()
        return state.recentItemsByRegion[region] || state.recentItems
      },
      
      // 重置
      reset: () => set(initialState, false, 'reset'),
    }),
    { name: 'MediaNewsStore' }
  )
)

// 选择器 hooks
export const useUpcomingItems = () => useMediaNewsStore((s) => s.upcomingItems)
export const useRecentItems = () => useMediaNewsStore((s) => s.recentItems)
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
