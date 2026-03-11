/**
 * 图片缓存 React Hook
 * 提供便捷的图片缓存查询和刷新功能
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getCachedImageUrl,
  refreshImageCache,
  type CacheImageOptions,
  type CacheImageResult,
} from '../image-cache-service';
import { logger } from '@/lib/utils/logger';

interface UseImageCacheOptions extends Omit<CacheImageOptions, 'forceRefresh'> {
  enabled?: boolean; // 是否自动查询
  fallbackUrl?: string; // 缓存未命中时的回退 URL
}

interface UseImageCacheReturn {
  url: string | null;
  isLoading: boolean;
  isCached: boolean;
  error: string | null;
  refresh: (mediaType?: 'movie' | 'tv') => Promise<void>;
}

/**
 * 使用图片缓存的 Hook
 * 自动从服务端缓存获取图片 URL
 *
 * @example
 * const { url, isLoading, refresh } = useImageCache({
 *   tmdbId: '12345',
 *   type: 'poster',
 *   size: 'w500',
 *   enabled: true,
 * });
 */
export function useImageCache(options: UseImageCacheOptions): UseImageCacheReturn {
  const { tmdbId, type, size = 'original', enabled = true, fallbackUrl } = options;

  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCache = useCallback(async () => {
    if (!tmdbId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getCachedImageUrl({ tmdbId, type, size });

      if (result.success) {
        setUrl(result.url || fallbackUrl || null);
        setIsCached(result.cached || false);
      } else {
        setError(result.error || '获取缓存失败');
        setUrl(fallbackUrl || null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取缓存失败';
      setError(errorMsg);
      setUrl(fallbackUrl || null);
      logger.error(`[useImageCache] 获取缓存失败: ${tmdbId}/${type}`, err);
    } finally {
      setIsLoading(false);
    }
  }, [tmdbId, type, size, fallbackUrl]);

  const refresh = useCallback(
    async (mediaType?: 'movie' | 'tv') => {
      if (!tmdbId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await refreshImageCache(tmdbId, type, mediaType, size);

        if (result.success) {
          setUrl(result.url || null);
          setIsCached(true);
        } else {
          setError(result.error || '刷新缓存失败');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '刷新缓存失败';
        setError(errorMsg);
        logger.error(`[useImageCache] 刷新缓存失败: ${tmdbId}/${type}`, err);
      } finally {
        setIsLoading(false);
      }
    },
    [tmdbId, type, size]
  );

  // 自动查询缓存
  useEffect(() => {
    if (enabled && tmdbId) {
      fetchCache();
    }
  }, [enabled, tmdbId, type, size, fetchCache]);

  return {
    url,
    isLoading,
    isCached,
    error,
    refresh,
  };
}

/**
 * 批量获取图片缓存的 Hook
 * 用于需要同时查询多个图片的场景
 *
 * @example
 * const images = useBatchImageCache([
 *   { tmdbId: '123', type: 'poster' },
 *   { tmdbId: '123', type: 'backdrop' },
 * ]);
 */
export function useBatchImageCache(
  optionsList: Array<Omit<UseImageCacheOptions, 'enabled'>>,
  enabled = true
): Array<UseImageCacheReturn> {
  const [results, setResults] = useState<CacheImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || optionsList.length === 0) return;

    const fetchAll = async () => {
      setIsLoading(true);

      try {
        const promises = optionsList.map((options) =>
          getCachedImageUrl({
            tmdbId: options.tmdbId,
            type: options.type,
            size: options.size,
          })
        );

        const results = await Promise.all(promises);
        setResults(results);
      } catch (error) {
        logger.error('[useBatchImageCache] 批量获取缓存失败', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [enabled, optionsList]);

  // 返回与输入选项列表对应的结果
  return optionsList.map((options, index) => ({
    url: results[index]?.success ? results[index].url || null : null,
    isLoading,
    isCached: results[index]?.cached || false,
    error: results[index]?.error || null,
    refresh: async (mediaType?: 'movie' | 'tv') => {
      await refreshImageCache(options.tmdbId, options.type, mediaType, options.size);
    },
  }));
}
