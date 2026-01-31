"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { logger } from "@/lib/utils/logger"
import { handleError, retryOperation } from "@/lib/utils/error-handler"
import { perf } from "@/lib/utils/performance-manager"
import { REGIONS } from "@/lib/constants/regions"

export interface MediaNewsItem {
  id: string
  title: string
  originalTitle?: string
  releaseDate: string
  posterUrl?: string
  overview?: string
  mediaType: "movie" | "tv"
  voteAverage?: number
}

export interface UseMediaNewsReturn {
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

export function useMediaNews(selectedRegion: string = "CN"): UseMediaNewsReturn {
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

  // Cache keys for better maintainability
  const cacheKeys = useMemo(() => ({
    getItemsKey: (type: "upcoming" | "recent", regionId: string) => `${type}Items_${regionId}`,
    getTimestampKey: (type: "upcoming" | "recent") => `${type}LastUpdated`
  }), [])

  // Cache loading helper
  const loadCacheForType = useCallback((type: "upcoming" | "recent"): Record<string, MediaNewsItem[]> => {
    const itemsByRegion: Record<string, MediaNewsItem[]> = {}

    REGIONS.forEach(region => {
      const cached = localStorage.getItem(cacheKeys.getItemsKey(type, region.id))
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) {
            itemsByRegion[region.id] = parsed
          }
        } catch (error) {
          logger.warn(`[useMediaNews] 解析${type}缓存数据失败: ${region.id}`, error)
          localStorage.removeItem(cacheKeys.getItemsKey(type, region.id))
        }
      }
    })

    return itemsByRegion
  }, [cacheKeys])

  // 加载缓存数据
  const loadCachedData = useCallback(() => {
    if (typeof window === "undefined") return

    try {
      const upcomingCache = loadCacheForType("upcoming")
      const recentCache = loadCacheForType("recent")

      if (Object.keys(upcomingCache).length > 0) {
        setUpcomingItemsByRegion(upcomingCache)
        if (upcomingCache[selectedRegion]) {
          setUpcomingItems(upcomingCache[selectedRegion])
        }
      }

      if (Object.keys(recentCache).length > 0) {
        setRecentItemsByRegion(recentCache)
        if (recentCache[selectedRegion]) {
          setRecentItems(recentCache[selectedRegion])
        }
      }

      // 加载更新时间
      const cachedUpcomingLastUpdated = localStorage.getItem(cacheKeys.getTimestampKey("upcoming"))
      const cachedRecentLastUpdated = localStorage.getItem(cacheKeys.getTimestampKey("recent"))
      if (cachedUpcomingLastUpdated) setUpcomingLastUpdated(cachedUpcomingLastUpdated)
      if (cachedRecentLastUpdated) setRecentLastUpdated(cachedRecentLastUpdated)
    } catch (error) {
      logger.error("[useMediaNews] 加载缓存数据失败", error)
    }
  }, [selectedRegion, loadCacheForType])

  // 通用的数据获取函数
  const fetchItems = useCallback(
    async (
      type: "upcoming" | "recent",
      region: string = selectedRegion,
      silent: boolean = false
    ): Promise<void> => {
      const timingLabel = `fetch${type === "upcoming" ? "Upcoming" : "Recent"}_${region}`
      perf.startTiming(timingLabel)

      const setLoading = type === "upcoming" ? setLoadingUpcoming : setLoadingRecent
      const setError = type === "upcoming" ? setUpcomingError : setRecentError
      const setLastUpdated = type === "upcoming" ? setUpcomingLastUpdated : setRecentLastUpdated
      const itemsByRegion = type === "upcoming" ? upcomingItemsByRegion : recentItemsByRegion
      const setItemsByRegion = type === "upcoming" ? setUpcomingItemsByRegion : setRecentItemsByRegion
      const setItems = type === "upcoming" ? setUpcomingItems : setRecentItems

      if (!silent) setLoading(true)
      setError(null)
      if (type === "upcoming") setIsMissingApiKey(false)

      try {
        const response = await retryOperation(
          () =>
            fetch(`/api/tmdb/${type}?region=${region}`, {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            }),
          3,
          1000,
          true
        )

        if (!response.ok) {
          const errorText = await response.text()
          if (response.status === 400 && errorText.includes("API密钥未配置")) {
            setIsMissingApiKey(true)
            throw new Error("TMDB API密钥未配置")
          }
          if (response.status === 401) {
            setIsMissingApiKey(true)
            throw new Error("用户身份验证失败，请刷新页面重试")
          }
          throw new Error(`获取${type === "upcoming" ? "即将上线" : "近期开播"}内容失败 (${response.status})`)
        }

        const data = await response.json()
        if (data.success) {
          // 更新区域数据
          const newItemsByRegion = { ...itemsByRegion }
          newItemsByRegion[region] = data.results
          setItemsByRegion(newItemsByRegion)

          // 如果是当前选中区域，更新主数据
          if (region === selectedRegion) {
            setItems(data.results)
          }

          const timestamp = new Date().toLocaleString("zh-CN")
          setLastUpdated(timestamp)

          // 缓存数据
          try {
            localStorage.setItem(cacheKeys.getItemsKey(type, region), JSON.stringify(data.results))
            localStorage.setItem(cacheKeys.getTimestampKey(type), timestamp)
          } catch (error) {
            logger.warn(`[useMediaNews] 缓存${type === "upcoming" ? "即将上线" : "近期开播"}数据失败`, error)
          }
        } else {
          throw new Error(data.error || `获取${type === "upcoming" ? "即将上线" : "近期开播"}内容失败`)
        }
      } catch (error) {
        const appError = handleError(error, { region, silent })

        // 对于TMDB API连接错误，不设置错误状态，避免在界面上显示错误
        if (!appError.message.includes("TMDB API连接失败") && !appError.message.includes("网络连接异常")) {
          setError(appError.userMessage)
        }

        if (appError.type === "API" && appError.code === "401") {
          setIsMissingApiKey(true)
        }

        // 静默记录日志，不显示用户错误
        logger.debug(`[useMediaNews] 获取${type === "upcoming" ? "即将上线" : "近期开播"}内容失败`, appError)
      } finally {
        if (!silent) setLoading(false)
        perf.endTiming(timingLabel)
      }
    },
    [selectedRegion]
  )

  // 获取即将上线内容
  const fetchUpcomingItems = useCallback(
    async (region: string = selectedRegion, silent: boolean = false) => {
      await fetchItems("upcoming", region, silent)
    },
    [fetchItems]
  )

  // 获取近期开播内容
  const fetchRecentItems = useCallback(
    async (region: string = selectedRegion, silent: boolean = false) => {
      await fetchItems("recent", region, silent)
    },
    [fetchItems]
  )

  // 刷新所有数据
  const refreshData = useCallback(async (): Promise<void> => {
    logger.info("[useMediaNews] 刷新所有媒体资讯数据")
    await Promise.all([
      fetchItems("upcoming", selectedRegion, false),
      fetchItems("recent", selectedRegion, false),
    ])
  }, [selectedRegion, fetchItems])

  // 初始化加载
  useEffect(() => {
    loadCachedData()

    // 延迟获取最新数据，避免阻塞UI
    const timeoutId = perf.setTimeout(() => {
      fetchItems("upcoming", selectedRegion, true)
      fetchItems("recent", selectedRegion, true)
    }, 100)

    // 定期刷新数据 (1小时)
    const intervalId = perf.setInterval(
      () => {
        fetchItems("upcoming", selectedRegion, true)
        fetchItems("recent", selectedRegion, true)
      },
      60 * 60 * 1000,
      "mediaNewsRefresh"
    )

    return () => {
      perf.cleanup(timeoutId)
      perf.cleanup(intervalId)
    }
  }, [loadCachedData, selectedRegion])

  // 当选中区域变化时更新数据
  useEffect(() => {
    // 更新即将上线内容
    if (upcomingItemsByRegion[selectedRegion]) {
      setUpcomingItems(upcomingItemsByRegion[selectedRegion])
    } else {
      fetchItems("upcoming", selectedRegion, false)
    }

    // 更新近期开播内容
    if (recentItemsByRegion[selectedRegion]) {
      setRecentItems(recentItemsByRegion[selectedRegion])
    } else {
      fetchItems("recent", selectedRegion, false)
    }
  }, [selectedRegion, upcomingItemsByRegion, recentItemsByRegion, fetchItems])

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