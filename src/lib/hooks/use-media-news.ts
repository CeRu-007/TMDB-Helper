'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import { handleError, retryOperation } from '@/lib/utils/error-handler';
import { useMediaNewsStore } from '@/stores/media-news-store';

export interface MediaNewsItem {
  id: string;
  title: string;
  originalTitle?: string;
  releaseDate: string;
  posterUrl?: string;
  overview?: string;
  mediaType: 'movie' | 'tv';
  voteAverage?: number;
}

export interface UseMediaNewsReturn {
  upcomingItems: MediaNewsItem[];
  recentItems: MediaNewsItem[];
  upcomingItemsByRegion: Record<string, MediaNewsItem[]>;
  recentItemsByRegion: Record<string, MediaNewsItem[]>;
  loadingUpcoming: boolean;
  loadingRecent: boolean;
  upcomingError: string | null;
  recentError: string | null;
  upcomingLastUpdated: string | null;
  recentLastUpdated: string | null;
  isMissingApiKey: boolean;
  fetchUpcomingItems: (region?: string, silent?: boolean) => Promise<void>;
  fetchRecentItems: (region?: string, silent?: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
  isTransitioning: boolean;
}

export function useMediaNews(selectedRegion: string = 'CN'): UseMediaNewsReturn {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const store = useMediaNewsStore();
  const fetchingRef = useRef<Record<string, boolean>>({});

  const upcomingItems = useMemo(
    () => store.upcomingItemsByRegion[selectedRegion] || [],
    [store.upcomingItemsByRegion, selectedRegion]
  );

  const recentItems = useMemo(
    () => store.recentItemsByRegion[selectedRegion] || [],
    [store.recentItemsByRegion, selectedRegion]
  );

  const upcomingLastUpdated = useMemo(
    () => store.upcomingLastUpdated[selectedRegion] || null,
    [store.upcomingLastUpdated, selectedRegion]
  );

  const recentLastUpdated = useMemo(
    () => store.recentLastUpdated[selectedRegion] || null,
    [store.recentLastUpdated, selectedRegion]
  );

  const LOADING_MIN_MS = 500;

  const fetchItems = useCallback(
    async (
      type: 'upcoming' | 'recent',
      region: string = selectedRegion,
      silent: boolean = false
    ): Promise<void> => {
      const s = useMediaNewsStore.getState();
      const setLoading = type === 'upcoming' ? s.setLoadingUpcoming : s.setLoadingRecent;
      const setError = type === 'upcoming' ? s.setUpcomingError : s.setRecentError;
      const setItems = type === 'upcoming' ? s.setUpcomingItems : s.setRecentItems;

      const loadingStartTime = Date.now();

      if (!silent) {
        setLoading(true);
      }
      setError(null);
      if (type === 'upcoming') {
        s.setIsMissingApiKey(false);
      }

      try {
        const response = await retryOperation(
          () =>
            fetch(`/api/tmdb/${type}?region=${region}`, {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
              },
            }),
          3,
          1000,
          true
        );

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorText;
          } catch {
            // 不是JSON格式，使用原始文本
          }

          if (response.status === 400 && errorMessage.includes('API密钥未配置')) {
            s.setIsMissingApiKey(true);
            throw new Error('TMDB API密钥未配置');
          }
          if (response.status === 401) {
            s.setIsMissingApiKey(true);
            throw new Error('API密钥无效或已过期，请在设置中配置有效的TMDB API密钥');
          }
          if (response.status === 429) {
            throw new Error('请求过于频繁，请稍后再试');
          }
          throw new Error(`${errorMessage} (${response.status})`);
        }

        const data = await response.json();
        if (data.success) {
          setItems(data.results, region);

          const timestamp = new Date().toLocaleString('zh-CN');
          if (type === 'upcoming') {
            s.setUpcomingLastUpdated(timestamp, region);
          } else {
            s.setRecentLastUpdated(timestamp, region);
          }

          try {
            localStorage.setItem(`${type}Items_${region}`, JSON.stringify(data.results));
            localStorage.setItem(`${type}LastUpdated_${region}`, timestamp);
          } catch (error) {
            logger.warn(`[useMediaNews] 缓存${type}数据失败`, error);
          }
        } else {
          throw new Error(
            data.error || `获取${type === 'upcoming' ? '即将上线' : '近期开播'}内容失败`
          );
        }
      } catch (error) {
        const appError = handleError(error, { region, silent });

        if (
          !appError.message.includes('TMDB API连接失败') &&
          !appError.message.includes('网络连接异常')
        ) {
          setError(appError.userMessage);
        }

        if (appError.type === 'API' && appError.code === '401') {
          s.setIsMissingApiKey(true);
        }

        logger.debug(
          `[useMediaNews] 获取${type === 'upcoming' ? '即将上线' : '近期开播'}内容失败`,
          appError
        );
      } finally {
        if (!silent) {
          const elapsed = Date.now() - loadingStartTime;
          const remaining = LOADING_MIN_MS - elapsed;
          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
          }
          setLoading(false);
        }
      }
    },
    [selectedRegion]
  );

  const loadCachedData = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const regions = ['CN', 'HK', 'TW', 'JP', 'KR', 'US', 'GB'];

      regions.forEach((region) => {
        const s = useMediaNewsStore.getState();
        const upcomingCached = localStorage.getItem(`upcomingItems_${region}`);
        const recentCached = localStorage.getItem(`recentItems_${region}`);
        const upcomingTimeCached = localStorage.getItem(`upcomingLastUpdated_${region}`);
        const recentTimeCached = localStorage.getItem(`recentLastUpdated_${region}`);

        if (upcomingCached) {
          try {
            const parsed = JSON.parse(upcomingCached);
            if (Array.isArray(parsed)) {
              s.setUpcomingItems(parsed, region);
            }
          } catch {
            localStorage.removeItem(`upcomingItems_${region}`);
          }
        }

        if (recentCached) {
          try {
            const parsed = JSON.parse(recentCached);
            if (Array.isArray(parsed)) {
              s.setRecentItems(parsed, region);
            }
          } catch {
            localStorage.removeItem(`recentItems_${region}`);
          }
        }

        if (upcomingTimeCached) {
          s.setUpcomingLastUpdated(upcomingTimeCached, region);
        }
        if (recentTimeCached) {
          s.setRecentLastUpdated(recentTimeCached, region);
        }
      });
    } catch (error) {
      logger.error('[useMediaNews] 加载缓存数据失败', error);
    }
  }, []);

  const fetchUpcomingItems = useCallback(
    async (region?: string, silent?: boolean) => {
      await fetchItems('upcoming', region || selectedRegion, silent);
    },
    [fetchItems, selectedRegion]
  );

  const fetchRecentItems = useCallback(
    async (region?: string, silent?: boolean) => {
      await fetchItems('recent', region || selectedRegion, silent);
    },
    [fetchItems, selectedRegion]
  );

  const refreshData = useCallback(async () => {
    logger.info('[useMediaNews] 刷新所有媒体资讯数据');
    await Promise.all([
      fetchItems('upcoming', selectedRegion, false),
      fetchItems('recent', selectedRegion, false),
    ]);
  }, [fetchItems, selectedRegion]);

  useEffect(() => {
    loadCachedData();

    const timeoutId = setTimeout(() => {
      fetchItems('upcoming', selectedRegion, true);
      fetchItems('recent', selectedRegion, true);
    }, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = useMediaNewsStore.getState();
    const upcomingForRegion = state.upcomingItemsByRegion[selectedRegion];
    const recentForRegion = state.recentItemsByRegion[selectedRegion];

    if (
      (!upcomingForRegion || upcomingForRegion.length === 0) &&
      !fetchingRef.current[`upcoming_${selectedRegion}`]
    ) {
      fetchingRef.current[`upcoming_${selectedRegion}`] = true;
      fetchItems('upcoming', selectedRegion, false).finally(() => {
        fetchingRef.current[`upcoming_${selectedRegion}`] = false;
      });
    }
    if (
      (!recentForRegion || recentForRegion.length === 0) &&
      !fetchingRef.current[`recent_${selectedRegion}`]
    ) {
      fetchingRef.current[`recent_${selectedRegion}`] = true;
      fetchItems('recent', selectedRegion, false).finally(() => {
        fetchingRef.current[`recent_${selectedRegion}`] = false;
      });
    }
  }, [selectedRegion, fetchItems]);

  return {
    upcomingItems: upcomingItems as MediaNewsItem[],
    recentItems: recentItems as MediaNewsItem[],
    upcomingItemsByRegion: store.upcomingItemsByRegion as unknown as Record<
      string,
      MediaNewsItem[]
    >,
    recentItemsByRegion: store.recentItemsByRegion as unknown as Record<string, MediaNewsItem[]>,
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
  };
}
