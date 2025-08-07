"use client"

import { useState, useEffect, useCallback } from 'react'
import { log } from '@/lib/logger'
import { handleError, retryOperation } from '@/lib/error-handler'
import { perf } from '@/lib/performance-manager'
import { ClientConfigManager } from '@/lib/client-config-manager'

interface MediaNewsItem {
  id: string
  title: string
  originalTitle?: string
  releaseDate: string
  posterUrl?: string
  overview?: string
  mediaType: 'movie' | 'tv'
  voteAverage?: number
}

interface UseMediaNewsReturn {
  upcomingItems: MediaNewsItem[]
  recentItems: MediaNewsItem[]
  upcomingItemsByRegion: Record<string, MediaNewsItem[]>
  recentItemsByRegion: Record<string, MediaNewsItem[]>
  loadingUpcoming: boolean
  loadingRecent: boolean
  upcomingError: string | null
  recentError: string | null
  upcomingLastUpdated: string | null
  recentLastUpdated: string | null
  isMissingApiKey: boolean
  fetchUpcomingItems: (region?: string, silent?: boolean) => Promise<void>
  fetchRecentItems: (region?: string, silent?: boolean) => Promise<void>
  refreshData: () => Promise<void>
}

const REGIONS = [
  { id: "CN", name: "中国大陆" },
  { id: "HK", name: "香港" },
  { id: "TW", name: "台湾" },
  { id: "JP", name: "日本" },
  { id: "KR", name: "韩国" },
  { id: "US", name: "美国" },
  { id: "GB", name: "英国" },
]

export function useMediaNews(selectedRegion: string = 'CN'): UseMediaNewsReturn {
  const [upcomingItems, setUpcomingItems] = useState<MediaNewsItem[]>([])
  const [recentItems, setRecentItems] = useState<MediaNewsItem[]>([])
  const [upcomingItemsByRegion, setUpcomingItemsByRegion] = useState<Record<string, MediaNewsItem[]>>({})
  const [recentItemsByRegion, setRecentItemsByRegion] = useState<Record<string, MediaNewsItem[]>>({})
  
  const [loadingUpcoming, setLoadingUpcoming] = useState(false)
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [upcomingLastUpdated, setUpcomingLastUpdated] = useState<string | null>(null)
  const [recentLastUpdated, setRecentLastUpdated] = useState<string | null>(null)
  const [isMissingApiKey, setIsMissingApiKey] = useState(false)

  // 加载缓存数据
  const loadCachedData = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      // 加载即将上线数据
      const newUpcomingItemsByRegion: Record<string, MediaNewsItem[]> = {}
      REGIONS.forEach(region => {
        const cached = localStorage.getItem(`upcomingItems_${region.id}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed)) {
              newUpcomingItemsByRegion[region.id] = parsed
            }
          } catch (error) {
            log.warn('useMediaNews', `解析缓存数据失败: ${region.id}`, error)
            localStorage.removeItem(`upcomingItems_${region.id}`)
          }
        }
      })
      
      if (Object.keys(newUpcomingItemsByRegion).length > 0) {
        setUpcomingItemsByRegion(newUpcomingItemsByRegion)
        if (newUpcomingItemsByRegion[selectedRegion]) {
          setUpcomingItems(newUpcomingItemsByRegion[selectedRegion])
        }
      }

      // 加载近期开播数据
      const newRecentItemsByRegion: Record<string, MediaNewsItem[]> = {}
      REGIONS.forEach(region => {
        const cached = localStorage.getItem(`recentItems_${region.id}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed)) {
              newRecentItemsByRegion[region.id] = parsed
            }
          } catch (error) {
            log.warn('useMediaNews', `解析近期开播缓存数据失败: ${region.id}`, error)
            localStorage.removeItem(`recentItems_${region.id}`)
          }
        }
      })
      
      if (Object.keys(newRecentItemsByRegion).length > 0) {
        setRecentItemsByRegion(newRecentItemsByRegion)
        if (newRecentItemsByRegion[selectedRegion]) {
          setRecentItems(newRecentItemsByRegion[selectedRegion])
        }
      }

      // 加载更新时间
      const cachedUpcomingLastUpdated = localStorage.getItem('upcomingLastUpdated')
      const cachedRecentLastUpdated = localStorage.getItem('recentLastUpdated')
      if (cachedUpcomingLastUpdated) setUpcomingLastUpdated(cachedUpcomingLastUpdated)
      if (cachedRecentLastUpdated) setRecentLastUpdated(cachedRecentLastUpdated)

    } catch (error) {
      log.error('useMediaNews', '加载缓存数据失败', error)
    }
  }, [selectedRegion])

  // 获取即将上线内容
  const fetchUpcomingItems = useCallback(async (region: string = selectedRegion, silent: boolean = false) => {
    const timingLabel = `fetchUpcoming_${region}`
    perf.startTiming(timingLabel)

    if (!silent) setLoadingUpcoming(true)
    setUpcomingError(null)
    setIsMissingApiKey(false)

    try {
      const apiKey = await ClientConfigManager.getItem("tmdb_api_key")
      if (!apiKey) {
        setIsMissingApiKey(true)
        throw new Error('TMDB API密钥未配置，请在设置中配置')
      }

      const response = await retryOperation(
        () => fetch(`/api/tmdb/upcoming?api_key=${encodeURIComponent(apiKey)}&region=${region}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        3,
        1000,
        true
      )

      if (!response.ok) {
        const errorText = await response.text()
        if (errorText.includes('API密钥未配置') || errorText.includes('401 Unauthorized')) {
          setIsMissingApiKey(true)
          throw new Error('TMDB API密钥无效，请在设置中重新配置')
        }
        throw new Error(`获取即将上线内容失败 (${response.status})`)
      }

      const data = await response.json()
      if (data.success) {
        // 更新区域数据
        const newUpcomingItemsByRegion = { ...upcomingItemsByRegion }
        newUpcomingItemsByRegion[region] = data.results
        setUpcomingItemsByRegion(newUpcomingItemsByRegion)
        
        // 如果是当前选中区域，更新主数据
        if (region === selectedRegion) {
          setUpcomingItems(data.results)
        }
        
        const timestamp = new Date().toLocaleString('zh-CN')
        setUpcomingLastUpdated(timestamp)
        
        // 缓存数据
        try {
          localStorage.setItem(`upcomingItems_${region}`, JSON.stringify(data.results))
          localStorage.setItem('upcomingLastUpdated', timestamp)
        } catch (error) {
          log.warn('useMediaNews', '缓存即将上线数据失败', error)
        }
      } else {
        throw new Error(data.error || '获取即将上线内容失败')
      }
    } catch (error) {
      const appError = handleError(error, { region, silent })
      
      // 对于TMDB API连接错误，不设置错误状态，避免在界面上显示错误
      if (!appError.message.includes('TMDB API连接失败') && !appError.message.includes('网络连接异常')) {
        setUpcomingError(appError.userMessage)
      }
      
      if (appError.type === 'API' && appError.code === '401') {
        setIsMissingApiKey(true)
      }
      
      // 静默记录日志，不显示用户错误
      log.debug('useMediaNews', '获取即将上线内容失败', appError)
    } finally {
      if (!silent) setLoadingUpcoming(false)
      perf.endTiming(timingLabel)
    }
  }, [selectedRegion, upcomingItemsByRegion])

  // 获取近期开播内容
  const fetchRecentItems = useCallback(async (region: string = selectedRegion, silent: boolean = false) => {
    const timingLabel = `fetchRecent_${region}`
    perf.startTiming(timingLabel)

    if (!silent) setLoadingRecent(true)
    setRecentError(null)

    try {
      const apiKey = await ClientConfigManager.getItem("tmdb_api_key")
      if (!apiKey) {
        throw new Error('TMDB API密钥未配置，请在设置中配置')
      }

      const response = await retryOperation(
        () => fetch(`/api/tmdb/recent?api_key=${encodeURIComponent(apiKey)}&region=${region}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        3,
        1000,
        true
      )

      if (!response.ok) {
        throw new Error(`获取近期开播内容失败 (${response.status})`)
      }

      const data = await response.json()
      if (data.success) {
        // 更新区域数据
        const newRecentItemsByRegion = { ...recentItemsByRegion }
        newRecentItemsByRegion[region] = data.results
        setRecentItemsByRegion(newRecentItemsByRegion)
        
        // 如果是当前选中区域，更新主数据
        if (region === selectedRegion) {
          setRecentItems(data.results)
        }
        
        const timestamp = new Date().toLocaleString('zh-CN')
        setRecentLastUpdated(timestamp)
        
        // 缓存数据
        try {
          localStorage.setItem(`recentItems_${region}`, JSON.stringify(data.results))
          localStorage.setItem('recentLastUpdated', timestamp)
        } catch (error) {
          log.warn('useMediaNews', '缓存近期开播数据失败', error)
        }
      } else {
        throw new Error(data.error || '获取近期开播内容失败')
      }
    } catch (error) {
      const appError = handleError(error, { region, silent })
      
      // 对于TMDB API连接错误，不设置错误状态，避免在界面上显示错误
      if (!appError.message.includes('TMDB API连接失败') && !appError.message.includes('网络连接异常')) {
        setRecentError(appError.userMessage)
      }
      
      // 静默记录日志，不显示用户错误
      log.debug('useMediaNews', '获取近期开播内容失败', appError)
    } finally {
      if (!silent) setLoadingRecent(false)
      perf.endTiming(timingLabel)
    }
  }, [selectedRegion, recentItemsByRegion])

  // 刷新所有数据
  const refreshData = useCallback(async () => {
    log.info('useMediaNews', '刷新所有媒体资讯数据')
    await Promise.all([
      fetchUpcomingItems(selectedRegion, false),
      fetchRecentItems(selectedRegion, false)
    ])
  }, [selectedRegion, fetchUpcomingItems, fetchRecentItems])

  // 初始化加载
  useEffect(() => {
    loadCachedData()
    
    // 延迟获取最新数据，避免阻塞UI
    const timeoutId = perf.setTimeout(() => {
      fetchUpcomingItems(selectedRegion, true)
      fetchRecentItems(selectedRegion, true)
    }, 100)

    // 定期刷新数据
    const intervalId = perf.setInterval(() => {
      fetchUpcomingItems(selectedRegion, true)
      fetchRecentItems(selectedRegion, true)
    }, 60 * 60 * 1000, 'mediaNewsRefresh') // 1小时

    return () => {
      perf.cleanup(timeoutId)
      perf.cleanup(intervalId)
    }
  }, [])

  // 当选中区域变化时更新数据
  useEffect(() => {
    if (upcomingItemsByRegion[selectedRegion]) {
      setUpcomingItems(upcomingItemsByRegion[selectedRegion])
    } else {
      fetchUpcomingItems(selectedRegion, false)
    }

    if (recentItemsByRegion[selectedRegion]) {
      setRecentItems(recentItemsByRegion[selectedRegion])
    } else {
      fetchRecentItems(selectedRegion, false)
    }
  }, [selectedRegion, upcomingItemsByRegion, recentItemsByRegion, fetchUpcomingItems, fetchRecentItems])

  return {
    upcomingItems,
    recentItems,
    upcomingItemsByRegion,
    recentItemsByRegion,
    loadingUpcoming,
    loadingRecent,
    upcomingError,
    recentError,
    upcomingLastUpdated,
    recentLastUpdated,
    isMissingApiKey,
    fetchUpcomingItems,
    fetchRecentItems,
    refreshData
  }
}