"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { logger } from "@/lib/utils/logger"
import { handleError, retryOperation } from "@/lib/utils/error-handler"
import { useMediaNewsStore } from "@/stores/media-news-store"

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
  isTransitioning: boolean
}

export function useMediaNews(selectedRegion: string = "CN"): UseMediaNewsReturn {
  // 切换区域时的过渡状态
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 从 Zustand store 获取所有状态
  const store = useMediaNewsStore()

  // 使用 useMemo 计算当前区域的数据，避免不必要的重渲染
  const upcomingItems = useMemo(() => {
    return store.upcomingItemsByRegion[selectedRegion] || []
  }, [store.upcomingItemsByRegion, selectedRegion])

  const recentItems = useMemo(() => {
    return store.recentItemsByRegion[selectedRegion] || []
  }, [store.recentItemsByRegion, selectedRegion])

  const upcomingLastUpdated = useMemo(() => {
    return store.upcomingLastUpdated[selectedRegion] || null
  }, [store.upcomingLastUpdated, selectedRegion])

  const recentLastUpdated = useMemo(() => {
    return store.recentLastUpdated[selectedRegion] || null
  }, [store.recentLastUpdated, selectedRegion])

  // 通用的数据获取函数
  const fetchItems = useCallback(
    async (
      type: "upcoming" | "recent",
      region: string = selectedRegion,
      silent: boolean = false
    ): Promise<void> => {
      const setLoading = type === "upcoming" ? store.setLoadingUpcoming : store.setLoadingRecent
      const setError = type === "upcoming" ? store.setUpcomingError : store.setRecentError
      const setItems = type === "upcoming" ? store.setUpcomingItems : store.setRecentItems

      if (!silent) {
        setLoading(true)
      }
      setError(null)
      if (type === "upcoming") {
        store.setIsMissingApiKey(false)
      }

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
          let errorMessage = errorText
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorText
          } catch {
            // 不是JSON格式，使用原始文本
          }

          if (response.status === 400 && errorMessage.includes("API密钥未配置")) {
            store.setIsMissingApiKey(true)
            throw new Error("TMDB API密钥未配置")
          }
          if (response.status === 401) {
            store.setIsMissingApiKey(true)
            throw new Error("API密钥无效或已过期，请在设置中配置有效的TMDB API密钥")
          }
          if (response.status === 429) {
            throw new Error("请求过于频繁，请稍后再试")
          }
          throw new Error(`${errorMessage} (${response.status})`)
        }

        const data = await response.json()
        if (data.success) {
          // 更新store中的数据
          setItems(data.results, region)

          const timestamp = new Date().toLocaleString("zh-CN")
          if (type === "upcoming") {
            store.setUpcomingLastUpdated(timestamp, region)
          } else {
            store.setRecentLastUpdated(timestamp, region)
          }

          // 缓存到localStorage
          try {
            localStorage.setItem(`${type}Items_${region}`, JSON.stringify(data.results))
            localStorage.setItem(`${type}LastUpdated_${region}`, timestamp)
          } catch (error) {
            logger.warn(`[useMediaNews] 缓存${type}数据失败`, error)
          }
        } else {
          throw new Error(data.error || `获取${type === "upcoming" ? "即将上线" : "近期开播"}内容失败`)
        }
      } catch (error) {
        const appError = handleError(error, { region, silent })

        if (!appError.message.includes("TMDB API连接失败") && !appError.message.includes("网络连接异常")) {
          setError(appError.userMessage)
        }

        if (appError.type === "API" && appError.code === "401") {
          store.setIsMissingApiKey(true)
        }

        logger.debug(`[useMediaNews] 获取${type === "upcoming" ? "即将上线" : "近期开播"}内容失败`, appError)
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [selectedRegion, store]
  )

  // 加载缓存数据
  const loadCachedData = useCallback(() => {
    if (typeof window === "undefined") return

    try {
      // 加载所有区域的缓存数据
      const regions = ["CN", "HK", "TW", "JP", "KR", "US", "GB"]

      regions.forEach((region) => {
        const upcomingCached = localStorage.getItem(`upcomingItems_${region}`)
        const recentCached = localStorage.getItem(`recentItems_${region}`)
        const upcomingTimeCached = localStorage.getItem(`upcomingLastUpdated_${region}`)
        const recentTimeCached = localStorage.getItem(`recentLastUpdated_${region}`)

        if (upcomingCached) {
          try {
            const parsed = JSON.parse(upcomingCached)
            if (Array.isArray(parsed)) {
              store.setUpcomingItems(parsed, region)
            }
          } catch {
            localStorage.removeItem(`upcomingItems_${region}`)
          }
        }

        if (recentCached) {
          try {
            const parsed = JSON.parse(recentCached)
            if (Array.isArray(parsed)) {
              store.setRecentItems(parsed, region)
            }
          } catch {
            localStorage.removeItem(`recentItems_${region}`)
          }
        }

        if (upcomingTimeCached) {
          store.setUpcomingLastUpdated(upcomingTimeCached, region)
        }
        if (recentTimeCached) {
          store.setRecentLastUpdated(recentTimeCached, region)
        }
      })
    } catch (error) {
      logger.error("[useMediaNews] 加载缓存数据失败", error)
    }
  }, [store])

  // 获取指定区域的数据
  const fetchUpcomingItems = useCallback(
    async (region?: string, silent?: boolean) => {
      await fetchItems("upcoming", region || selectedRegion, silent)
    },
    [fetchItems, selectedRegion]
  )

  const fetchRecentItems = useCallback(
    async (region?: string, silent?: boolean) => {
      await fetchItems("recent", region || selectedRegion, silent)
    },
    [fetchItems, selectedRegion]
  )

  const refreshData = useCallback(async () => {
    logger.info("[useMediaNews] 刷新所有媒体资讯数据")
    await Promise.all([
      fetchItems("upcoming", selectedRegion, false),
      fetchItems("recent", selectedRegion, false),
    ])
  }, [fetchItems, selectedRegion])

  // 初始化加载
  useEffect(() => {
    loadCachedData()

    // 延迟获取最新数据
    const timeoutId = setTimeout(() => {
      fetchItems("upcoming", selectedRegion, true)
      fetchItems("recent", selectedRegion, true)
    }, 100)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在挂载时运行

  // 当选中区域变化时，加载该区域的数据（如果还没有）
  useEffect(() => {
    const upcomingForRegion = store.upcomingItemsByRegion[selectedRegion]
    const recentForRegion = store.recentItemsByRegion[selectedRegion]

    // 如果该区域没有数据，加载它
    if (!upcomingForRegion || upcomingForRegion.length === 0) {
      fetchItems("upcoming", selectedRegion, false)
    }
    if (!recentForRegion || recentForRegion.length === 0) {
      fetchItems("recent", selectedRegion, false)
    }
  }, [selectedRegion, fetchItems, store.upcomingItemsByRegion, store.recentItemsByRegion])

  return {
    upcomingItems,
    recentItems,
    upcomingItemsByRegion: store.upcomingItemsByRegion,
    recentItemsByRegion: store.recentItemsByRegion,
    loadingUpcoming: store.loadingUpcoming,
    loadingRecent: store.loadingRecent,
    upcomingError: store.upcomingError,
    recentError: store.recentError,
    upcomingLastUpdated,
    recentLastUpdated,
    isMissingApiKey: store.isMissingApiKey,
    fetchUpcomingItems,
    fetchRecentItems,
    refreshData,
    isTransitioning,
  }
}
