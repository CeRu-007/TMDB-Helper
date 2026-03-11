/**
 * 客户端图片缓存服务
 * 与数据库缓存层交互，提供图片 URL 的获取和刷新功能
 * 完全替代原有的 LocalStorage 缓存机制
 */

import { logger } from '@/lib/utils/logger';
import type { ImageCacheData } from '@/lib/database/types';
import type { TMDBItem } from '@/types/tmdb-item';

const API_BASE = '/api/media/images/cache';

export interface CacheImageOptions {
  tmdbId: string;
  type: 'poster' | 'backdrop' | 'logo' | 'network_logo';
  size?: 'w500' | 'w780' | 'w1280' | 'original';
  forceRefresh?: boolean;
}

export interface CacheImageResult {
  success: boolean;
  url?: string;
  cached?: boolean;
  error?: string;
}

/**
 * 获取图片 URL
 * 优先从服务端缓存获取，未缓存时返回 null（由调用方决定如何处理）
 */
export async function getCachedImageUrl(options: CacheImageOptions): Promise<CacheImageResult> {
  const { tmdbId, type, size = 'original', forceRefresh = false } = options;

  try {
    // 如果需要强制刷新，先使缓存失效
    if (forceRefresh) {
      await invalidateCache(tmdbId, type, size);
    }

    const response = await fetch(`${API_BASE}?tmdbId=${tmdbId}&type=${type}&size=${size}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取缓存失败');
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      cached: data.cached,
    };
  } catch (error) {
    logger.error(`[ImageCacheService] 获取图片缓存失败: ${tmdbId}/${type}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取失败',
    };
  }
}

/**
 * 批量缓存图片
 * 通常在获取到 item 列表后调用，将图片信息缓存到数据库
 */
export async function batchCacheImages(
  items: Array<{
    tmdbId?: string | number;
    id?: string;
    posterPath?: string;
    backdropPath?: string;
    logoPath?: string;
  }>
): Promise<{ success: boolean; cachedCount?: number; error?: string }> {
  try {
    // 过滤有效的 item
    const validItems = items
      .filter((item) => item.tmdbId && (item.posterPath || item.backdropPath || item.logoPath))
      .map((item) => ({
        tmdbId: String(item.tmdbId),
        itemId: item.id,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        logoPath: item.logoPath,
      }));

    if (validItems.length === 0) {
      return { success: true, cachedCount: 0 };
    }

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validItems }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '批量缓存失败');
    }

    const data = await response.json();

    return {
      success: true,
      cachedCount: data.cachedCount,
    };
  } catch (error) {
    logger.error('[ImageCacheService] 批量缓存图片失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '批量缓存失败',
    };
  }
}

/**
 * 刷新特定图片缓存
 * 从 TMDB 获取最新数据并更新缓存
 */
export async function refreshImageCache(
  tmdbId: string,
  type: 'poster' | 'backdrop' | 'logo',
  mediaType?: 'movie' | 'tv',
  size?: 'w500' | 'w780' | 'w1280' | 'original'
): Promise<CacheImageResult> {
  try {
    const response = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId,
        type,
        mediaType,
        size: size || 'original',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '刷新缓存失败');
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
      cached: true,
    };
  } catch (error) {
    logger.error(`[ImageCacheService] 刷新图片缓存失败: ${tmdbId}/${type}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '刷新失败',
    };
  }
}

/**
 * 使缓存失效（删除）
 */
export async function invalidateCache(
  tmdbId: string,
  type?: 'poster' | 'backdrop' | 'logo' | 'network_logo',
  size?: 'w500' | 'w780' | 'w1280' | 'original'
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    let url = `${API_BASE}?tmdbId=${tmdbId}`;
    if (type) url += `&type=${type}`;
    if (size) url += `&size=${size}`;

    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '删除缓存失败');
    }

    const data = await response.json();

    return {
      success: true,
      deletedCount: data.deletedCount,
    };
  } catch (error) {
    logger.error(`[ImageCacheService] 删除图片缓存失败: ${tmdbId}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    };
  }
}

/**
 * 构建 TMDB 图片完整 URL
 * 这是一个纯客户端函数，不需要服务端交互
 */
export function buildTMDBImageUrl(
  path: string | null | undefined,
  size: 'w500' | 'w780' | 'w1280' | 'original' = 'original'
): string | null {
  if (!path) return null;

  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http')) return path;

  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `https://image.tmdb.org/t/p/${size}${normalizedPath}`;
}

/**
 * 从 TMDBItem 提取并缓存所有图片
 * 这是便捷函数，用于在获取 item 详情后缓存其所有图片
 */
export async function cacheImagesFromItem(item: TMDBItem): Promise<{ success: boolean; cachedCount: number }> {
  if (!item.tmdbId) {
    return { success: true, cachedCount: 0 };
  }

  const images: Array<{ tmdbId: string; itemId: string; posterPath?: string; backdropPath?: string; logoPath?: string }> = [
    {
      tmdbId: item.tmdbId,
      itemId: item.id,
      posterPath: item.posterPath,
      backdropPath: item.backdropPath,
      logoPath: item.logoPath,
    },
  ];

  const result = await batchCacheImages(images);

  return {
    success: result.success,
    cachedCount: result.cachedCount || 0,
  };
}

/**
 * 预加载图片（返回 Promise，可用于并发加载）
 */
export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * 批量预加载图片
 */
export async function preloadImages(urls: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.all(urls.map((url) => preloadImage(url)));

  const success = results.filter((r) => r).length;
  const failed = results.length - success;

  return { success, failed };
}

// 导出便捷 hooks 供 React 组件使用
export { useImageCache } from './hooks/use-image-cache';
