/**
 * 图片缓存 API
 * 提供图片缓存的查询、批量缓存、刷新功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageCacheRepository } from '@/lib/database/repositories/image-cache.repository';
import { TMDBService } from '@/lib/tmdb/tmdb';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import type { ImageCacheData } from '@/lib/database/types';

/**
 * GET /api/media/images/cache
 * 查询缓存的图片 URL
 * Query params:
 * - tmdbId: TMDB ID（必需）
 * - type: 图片类型 poster | backdrop | logo | network_logo（必需）
 * - size: 尺寸 w500 | w780 | w1280 | original（默认 original）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    const imageType = searchParams.get('type') as ImageCacheData['imageType'] | null;
    const sizeType = (searchParams.get('size') as ImageCacheData['sizeType']) || 'original';

    if (!tmdbId || !imageType) {
      return NextResponse.json(
        { error: '缺少必需参数: tmdbId 和 type' },
        { status: 400 }
      );
    }

    // 验证图片类型
    const validTypes: ImageCacheData['imageType'][] = ['poster', 'backdrop', 'logo', 'network_logo'];
    if (!validTypes.includes(imageType)) {
      return NextResponse.json(
        { error: '无效的图片类型' },
        { status: 400 }
      );
    }

    // 查询缓存
    const cachedUrl = imageCacheRepository.getImageUrl(tmdbId, imageType, sizeType);

    if (cachedUrl) {
      return NextResponse.json({
        success: true,
        cached: true,
        url: cachedUrl,
        tmdbId,
        type: imageType,
        size: sizeType,
      });
    }

    // 未缓存，需要从 TMDB 获取
    // 注意：这里不自动获取，而是由调用方决定如何处理
    return NextResponse.json({
      success: true,
      cached: false,
      url: null,
      tmdbId,
      type: imageType,
      size: sizeType,
    });
  } catch (error) {
    logger.error('[API] 获取图片缓存失败', error);
    return NextResponse.json(
      { error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}

/**
 * POST /api/media/images/cache
 * 批量缓存图片信息
 * Body: {
 *   items: Array<{
 *     tmdbId: string,
 *     itemId?: string,
 *     posterPath?: string,
 *     backdropPath?: string,
 *     logoPath?: string
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '缺少必需参数: items（必须是数组）' },
        { status: 400 }
      );
    }

    const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
    const cacheDataList: ImageCacheData[] = [];

    for (const item of items) {
      const { tmdbId, itemId, posterPath, backdropPath, logoPath } = item;

      if (!tmdbId) continue;

      // 缓存海报
      if (posterPath) {
        cacheDataList.push({
          tmdbId: String(tmdbId),
          itemId: itemId ? String(itemId) : undefined,
          imageType: 'poster',
          imagePath: posterPath,
          imageUrl: `${TMDB_IMAGE_BASE}/original${posterPath}`,
          sizeType: 'original',
          sourceType: 'tmdb',
          isPermanent: true,
        });
      }

      // 缓存背景图
      if (backdropPath) {
        cacheDataList.push({
          tmdbId: String(tmdbId),
          itemId: itemId ? String(itemId) : undefined,
          imageType: 'backdrop',
          imagePath: backdropPath,
          imageUrl: `${TMDB_IMAGE_BASE}/original${backdropPath}`,
          sizeType: 'original',
          sourceType: 'tmdb',
          isPermanent: true,
        });
      }

      // 缓存 Logo
      if (logoPath) {
        cacheDataList.push({
          tmdbId: String(tmdbId),
          itemId: itemId ? String(itemId) : undefined,
          imageType: 'logo',
          imagePath: logoPath,
          imageUrl: `${TMDB_IMAGE_BASE}/original${logoPath}`,
          sizeType: 'original',
          sourceType: 'tmdb',
          isPermanent: true,
        });
      }
    }

    if (cacheDataList.length === 0) {
      return NextResponse.json({
        success: true,
        cachedCount: 0,
        message: '没有需要缓存的图片',
      });
    }

    // 批量缓存
    const result = imageCacheRepository.batchCacheImages(cacheDataList);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '缓存失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cachedCount: result.data,
      totalCount: cacheDataList.length,
    });
  } catch (error) {
    logger.error('[API] 批量缓存图片失败', error);
    return NextResponse.json(
      { error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}

/**
 * DELETE /api/media/images/cache
 * 删除特定缓存
 * Query params:
 * - tmdbId: TMDB ID（必需）
 * - type: 图片类型（可选，不传则删除该 tmdbId 的所有缓存）
 * - size: 尺寸（可选）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    const imageType = searchParams.get('type') as ImageCacheData['imageType'] | null;
    const sizeType = searchParams.get('size') as ImageCacheData['sizeType'] | null;

    if (!tmdbId) {
      return NextResponse.json(
        { error: '缺少必需参数: tmdbId' },
        { status: 400 }
      );
    }

    const result = imageCacheRepository.invalidateCache(
      tmdbId,
      imageType ?? undefined,
      sizeType ?? undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.data,
      tmdbId,
      type: imageType,
      size: sizeType,
    });
  } catch (error) {
    logger.error('[API] 删除图片缓存失败', error);
    return NextResponse.json(
      { error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
