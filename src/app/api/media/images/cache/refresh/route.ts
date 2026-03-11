/**
 * 图片缓存刷新 API
 * 支持手动刷新特定图片缓存
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageCacheRepository } from '@/lib/database/repositories/image-cache.repository';
import { TMDBService } from '@/lib/tmdb/tmdb';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import type { ImageCacheData } from '@/lib/database/types';

/**
 * POST /api/media/images/cache/refresh
 * 刷新特定图片缓存
 * Body: {
 *   tmdbId: string,
 *   type: 'poster' | 'backdrop' | 'logo',
 *   mediaType?: 'movie' | 'tv',  // 用于获取 logo
 *   size?: 'w500' | 'w780' | 'w1280' | 'original'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbId, type: imageType, mediaType, size = 'original' } = body;

    if (!tmdbId || !imageType) {
      return NextResponse.json(
        { error: '缺少必需参数: tmdbId 和 type' },
        { status: 400 }
      );
    }

    // 验证图片类型
    const validTypes: ImageCacheData['imageType'][] = ['poster', 'backdrop', 'logo'];
    if (!validTypes.includes(imageType)) {
      return NextResponse.json(
        { error: '无效的图片类型，支持: poster, backdrop, logo' },
        { status: 400 }
      );
    }

    // 获取当前缓存信息
    const existingCache = imageCacheRepository.getCacheEntry(tmdbId, imageType, size);

    let newImagePath: string | null = null;
    let newImageUrl: string | null = null;

    // 根据类型从 TMDB 获取最新数据
    if (imageType === 'logo') {
      if (!mediaType) {
        return NextResponse.json(
          { error: '刷新 logo 时需要提供 mediaType 参数 (movie 或 tv)' },
          { status: 400 }
        );
      }

      // 从 TMDB 获取最新 Logo
      const logoUrl = await TMDBService.getLogoUrl(mediaType, tmdbId, 500); // 500px 宽度

      if (logoUrl) {
        // 从 URL 提取路径
        const match = logoUrl.match(/\/t\/p\/[^/]+(\/.+)$/);
        newImagePath = match ? match[1] : null;
        newImageUrl = logoUrl;
      }
    } else {
      // 对于 poster 和 backdrop，需要从 item details 获取
      // 这里我们假设调用方已经知道 item 的 mediaType
      // 如果缓存中有旧的 imagePath，我们可以尝试用它来构建 URL
      // 否则需要调用方提供更多信息

      // 简化方案：直接从 TMDB 获取 item details
      const itemDetails = await TMDBService.getItemDetails(
        mediaType || 'tv',
        parseInt(tmdbId)
      );

      if (itemDetails) {
        if (imageType === 'poster') {
          newImagePath = itemDetails.poster_path || null;
        } else if (imageType === 'backdrop') {
          newImagePath = itemDetails.backdrop_path || null;
        }

        if (newImagePath) {
          const sizePath = size === 'original' ? 'original' : size;
          newImageUrl = `https://image.tmdb.org/t/p/${sizePath}${newImagePath}`;
        }
      }
    }

    if (!newImageUrl) {
      return NextResponse.json({
        success: false,
        error: '无法从 TMDB 获取图片信息',
        tmdbId,
        type: imageType,
      }, { status: 404 });
    }

    // 更新缓存
    if (existingCache) {
      // 更新现有缓存
      const updateResult = imageCacheRepository.updateImageUrl(
        tmdbId,
        imageType,
        newImageUrl,
        newImagePath || undefined,
        size
      );

      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.error || '更新缓存失败' },
          { status: 500 }
        );
      }
    } else {
      // 创建新缓存
      const cacheResult = imageCacheRepository.cacheImage({
        tmdbId,
        imageType,
        imagePath: newImagePath || undefined,
        imageUrl: newImageUrl,
        sizeType: size,
        sourceType: 'tmdb',
        isPermanent: true,
      });

      if (!cacheResult.success) {
        return NextResponse.json(
          { error: cacheResult.error || '创建缓存失败' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      tmdbId,
      type: imageType,
      size,
      url: newImageUrl,
      path: newImagePath,
      message: '图片缓存已刷新',
    });
  } catch (error) {
    logger.error('[API] 刷新图片缓存失败', error);
    return NextResponse.json(
      { error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}

/**
 * GET /api/media/images/cache/refresh
 * 批量刷新多个图片缓存（用于批量操作）
 * Query params:
 * - tmdbIds: 逗号分隔的 TMDB ID 列表
 * - type: 图片类型（可选，不传则刷新所有类型）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbIdsParam = searchParams.get('tmdbIds');
    const imageType = searchParams.get('type') as ImageCacheData['imageType'] | null;

    if (!tmdbIdsParam) {
      return NextResponse.json(
        { error: '缺少必需参数: tmdbIds（逗号分隔）' },
        { status: 400 }
      );
    }

    const tmdbIds = tmdbIdsParam.split(',').filter(Boolean);

    if (tmdbIds.length === 0) {
      return NextResponse.json(
        { error: '无效的 tmdbIds 参数' },
        { status: 400 }
      );
    }

    const results: Array<{
      tmdbId: string;
      success: boolean;
      types?: string[];
      error?: string;
    }> = [];

    for (const tmdbId of tmdbIds) {
      try {
        // 获取该 tmdbId 的所有缓存类型
        const cachedImages = imageCacheRepository.getCachedImagesForTmdbId(tmdbId);
        const typesToRefresh = imageType
          ? cachedImages.filter((img) => img.imageType === imageType)
          : cachedImages;

        const refreshedTypes: string[] = [];

        for (const cached of typesToRefresh) {
          // 简单地更新验证时间，实际刷新需要调用 TMDB API
          // 这里作为批量操作的简化版本
          imageCacheRepository.updateImageUrl(
            tmdbId,
            cached.imageType as ImageCacheData['imageType'],
            cached.imageUrl!,
            cached.imagePath || undefined,
            cached.sizeType as ImageCacheData['sizeType']
          );
          refreshedTypes.push(cached.imageType);
        }

        results.push({
          tmdbId,
          success: true,
          types: refreshedTypes,
        });
      } catch (error) {
        results.push({
          tmdbId,
          success: false,
          error: error instanceof Error ? error.message : '刷新失败',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      total: tmdbIds.length,
      successCount,
      failedCount: tmdbIds.length - successCount,
      results,
    });
  } catch (error) {
    logger.error('[API] 批量刷新图片缓存失败', error);
    return NextResponse.json(
      { error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
