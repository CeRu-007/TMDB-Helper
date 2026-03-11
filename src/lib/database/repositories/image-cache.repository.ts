/**
 * 图片缓存 Repository
 * 管理 TMDB 图片的缓存数据，支持永久缓存和手动刷新
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type { ImageCacheRow, ImageCacheData, DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

export class ImageCacheRepository extends BaseRepository<ImageCacheData, ImageCacheRow> {
  protected tableName = 'image_cache';

  /**
   * 获取缓存的图片 URL
   * 如果不存在返回 null
   */
  getImageUrl(
    tmdbId: string,
    imageType: ImageCacheData['imageType'],
    sizeType: ImageCacheData['sizeType'] = 'original'
  ): string | null {
    const db = getDatabase();

    try {
      const row = db
        .prepare(
          'SELECT imageUrl FROM image_cache WHERE tmdbId = ? AND imageType = ? AND sizeType = ?'
        )
        .get(tmdbId, imageType, sizeType) as ImageCacheRow | undefined;

      return row?.imageUrl ?? null;
    } catch (error) {
      logger.error(`[ImageCacheRepository] 获取图片缓存失败: ${tmdbId}/${imageType}`, error);
      return null;
    }
  }

  /**
   * 获取完整的缓存记录
   */
  getCacheEntry(
    tmdbId: string,
    imageType: ImageCacheData['imageType'],
    sizeType: ImageCacheData['sizeType'] = 'original'
  ): ImageCacheRow | undefined {
    const db = getDatabase();

    try {
      return db
        .prepare(
          'SELECT * FROM image_cache WHERE tmdbId = ? AND imageType = ? AND sizeType = ?'
        )
        .get(tmdbId, imageType, sizeType) as ImageCacheRow | undefined;
    } catch (error) {
      logger.error(`[ImageCacheRepository] 获取缓存记录失败: ${tmdbId}/${imageType}`, error);
      return undefined;
    }
  }

  /**
   * 缓存图片信息
   * 如果已存在则更新
   */
  cacheImage(data: ImageCacheData): DatabaseResult<ImageCacheRow> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      const result = db
        .prepare(
          `
        INSERT INTO image_cache (
          tmdbId, itemId, imageType, imagePath, imageUrl, sizeType,
          createdAt, updatedAt, lastVerifiedAt, isPermanent, sourceType
        ) VALUES (
          @tmdbId, @itemId, @imageType, @imagePath, @imageUrl, @sizeType,
          @createdAt, @updatedAt, @lastVerifiedAt, @isPermanent, @sourceType
        )
        ON CONFLICT(tmdbId, imageType, sizeType) DO UPDATE SET
          imagePath = @imagePath,
          imageUrl = @imageUrl,
          updatedAt = @updatedAt,
          lastVerifiedAt = @lastVerifiedAt
        RETURNING *
      `
        )
        .get({
          tmdbId: data.tmdbId,
          itemId: data.itemId ?? null,
          imageType: data.imageType,
          imagePath: data.imagePath ?? null,
          imageUrl: data.imageUrl ?? null,
          sizeType: data.sizeType ?? 'original',
          createdAt: data.createdAt ?? now,
          updatedAt: now,
          lastVerifiedAt: data.lastVerifiedAt ?? now,
          isPermanent: data.isPermanent !== false ? 1 : 0,
          sourceType: data.sourceType ?? 'tmdb',
        }) as ImageCacheRow;

      return { success: true, data: result };
    } catch (error) {
      logger.error(`[ImageCacheRepository] 缓存图片失败: ${data.tmdbId}/${data.imageType}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '缓存失败',
      };
    }
  }

  /**
   * 批量缓存图片
   */
  batchCacheImages(dataList: ImageCacheData[]): DatabaseResult<number> {
    const db = getDatabase();
    let successCount = 0;

    // 使用事务
    const transaction = db.transaction(() => {
      for (const data of dataList) {
        const result = this.cacheImage(data);
        if (result.success) {
          successCount++;
        }
      }
    });

    try {
      transaction();
      return { success: true, data: successCount };
    } catch (error) {
      logger.error('[ImageCacheRepository] 批量缓存图片失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量缓存失败',
      };
    }
  }

  /**
   * 更新缓存的图片 URL（用于刷新）
   */
  updateImageUrl(
    tmdbId: string,
    imageType: ImageCacheData['imageType'],
    imageUrl: string,
    imagePath?: string,
    sizeType: ImageCacheData['sizeType'] = 'original'
  ): DatabaseResult {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      const updates: string[] = ['updatedAt = @updatedAt', 'lastVerifiedAt = @lastVerifiedAt'];
      const params: Record<string, unknown> = {
        tmdbId,
        imageType,
        sizeType,
        updatedAt: now,
        lastVerifiedAt: now,
      };

      if (imageUrl !== undefined) {
        updates.push('imageUrl = @imageUrl');
        params.imageUrl = imageUrl;
      }

      if (imagePath !== undefined) {
        updates.push('imagePath = @imagePath');
        params.imagePath = imagePath;
      }

      db.prepare(
        `UPDATE image_cache SET ${updates.join(', ')} WHERE tmdbId = @tmdbId AND imageType = @imageType AND sizeType = @sizeType`
      ).run(params);

      return { success: true };
    } catch (error) {
      logger.error(`[ImageCacheRepository] 更新图片缓存失败: ${tmdbId}/${imageType}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 使特定缓存失效（删除）
   */
  invalidateCache(
    tmdbId: string,
    imageType?: ImageCacheData['imageType'],
    sizeType?: ImageCacheData['sizeType']
  ): DatabaseResult<number> {
    const db = getDatabase();

    try {
      let sql = 'DELETE FROM image_cache WHERE tmdbId = ?';
      const params: (string | number)[] = [tmdbId];

      if (imageType) {
        sql += ' AND imageType = ?';
        params.push(imageType);
      }

      if (sizeType) {
        sql += ' AND sizeType = ?';
        params.push(sizeType);
      }

      const result = db.prepare(sql).run(...params);

      return { success: true, data: result.changes };
    } catch (error) {
      logger.error(`[ImageCacheRepository] 删除缓存失败: ${tmdbId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 获取某个 TMDB ID 的所有缓存图片
   */
  getCachedImagesForTmdbId(tmdbId: string): ImageCacheRow[] {
    const db = getDatabase();

    try {
      return db
        .prepare('SELECT * FROM image_cache WHERE tmdbId = ? ORDER BY imageType, sizeType')
        .all(tmdbId) as ImageCacheRow[];
    } catch (error) {
      logger.error(`[ImageCacheRepository] 获取缓存列表失败: ${tmdbId}`, error);
      return [];
    }
  }

  /**
   * 获取某个 item 的所有缓存图片
   */
  getCachedImagesForItem(itemId: string): ImageCacheRow[] {
    const db = getDatabase();

    try {
      return db
        .prepare('SELECT * FROM image_cache WHERE itemId = ? ORDER BY imageType, sizeType')
        .all(itemId) as ImageCacheRow[];
    } catch (error) {
      logger.error(`[ImageCacheRepository] 获取缓存列表失败: itemId=${itemId}`, error);
      return [];
    }
  }

  /**
   * 检查缓存是否存在
   */
  hasCache(
    tmdbId: string,
    imageType: ImageCacheData['imageType'],
    sizeType: ImageCacheData['sizeType'] = 'original'
  ): boolean {
    const db = getDatabase();

    try {
      const result = db
        .prepare(
          'SELECT 1 FROM image_cache WHERE tmdbId = ? AND imageType = ? AND sizeType = ?'
        )
        .get(tmdbId, imageType, sizeType);

      return !!result;
    } catch (error) {
      logger.error(`[ImageCacheRepository] 检查缓存存在失败: ${tmdbId}/${imageType}`, error);
      return false;
    }
  }

  /**
   * 清除所有非永久缓存（当前版本所有缓存都是永久的，此方法为未来扩展预留）
   */
  clearNonPermanentCache(): DatabaseResult<number> {
    const db = getDatabase();

    try {
      const result = db.prepare('DELETE FROM image_cache WHERE isPermanent = 0').run();

      logger.info(`[ImageCacheRepository] 已清除 ${result.changes} 条非永久缓存`);
      return { success: true, data: result.changes };
    } catch (error) {
      logger.error('[ImageCacheRepository] 清除非永久缓存失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '清除失败',
      };
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    total: number;
    byType: Record<string, number>;
  } {
    const db = getDatabase();

    try {
      const total = (db.prepare('SELECT COUNT(*) as count FROM image_cache').get() as { count: number }).count;

      const byTypeRows = db
        .prepare('SELECT imageType, COUNT(*) as count FROM image_cache GROUP BY imageType')
        .all() as Array<{ imageType: string; count: number }>;

      const byType: Record<string, number> = {};
      for (const row of byTypeRows) {
        byType[row.imageType] = row.count;
      }

      return { total, byType };
    } catch (error) {
      logger.error('[ImageCacheRepository] 获取缓存统计失败', error);
      return { total: 0, byType: {} };
    }
  }
}

// 导出单例
export const imageCacheRepository = new ImageCacheRepository();
