/**
 * 媒体项目 Repository
 * 使用 camelCase 字段名，与数据库 Schema 保持一致
 */

import { getDatabase } from '../connection';
import { BaseRepository } from './base.repository';
import type { ItemRow, SeasonRow, EpisodeRow, DatabaseResult } from '../types';
import { rowToTMDBItem, tmdbItemToRow } from '../types';
import type { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ItemsRepository extends BaseRepository<TMDBItem, ItemRow> {
  protected tableName = 'items';

  /**
   * 获取所有项目（带季和分集信息），排除软删除
   */
  findAllWithRelations(): TMDBItem[] {
    const db = getDatabase();
    const items = db
      .prepare('SELECT * FROM items WHERE deletedAt IS NULL ORDER BY createdAt DESC')
      .all() as ItemRow[];

    return items.map((item) => this.loadRelations(db, item));
  }

  /**
   * 根据ID获取项目（带季和分集信息）
   */
  findByIdWithRelations(id: string): TMDBItem | undefined {
    const db = getDatabase();
    const item = db
      .prepare('SELECT * FROM items WHERE id = ? AND deletedAt IS NULL')
      .get(id) as ItemRow | undefined;

    if (!item) return undefined;
    return this.loadRelations(db, item);
  }

  /**
   * 加载关联数据（季和分集）
   */
  private loadRelations(
    db: ReturnType<typeof getDatabase>,
    item: ItemRow,
  ): TMDBItem {
    // 加载季信息（带分集）
    const seasons = db
      .prepare('SELECT * FROM seasons WHERE itemId = ? ORDER BY seasonNumber')
      .all(item.id) as SeasonRow[];

    const seasonsWithEpisodes = seasons.map((season) => {
      const episodes = db
        .prepare('SELECT * FROM episodes WHERE seasonId = ? ORDER BY number')
        .all(season.id) as EpisodeRow[];
      return { ...season, episodes };
    });

    // 加载独立分集（兼容旧数据）
    const standaloneEpisodes = db
      .prepare(
        'SELECT * FROM episodes WHERE itemId = ? AND seasonId IS NULL ORDER BY number',
      )
      .all(item.id) as EpisodeRow[];

    return rowToTMDBItem(item, seasonsWithEpisodes, standaloneEpisodes);
  }

  /**
   * 创建项目
   */
  create(item: TMDBItem): DatabaseResult<TMDBItem> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      const row: ItemRow = tmdbItemToRow(item, { createdAt: item.createdAt ?? now, updatedAt: now });

      const insertItem = db.prepare(`
        INSERT INTO items (
          id, tmdbId, imdbId, title, originalTitle, overview, year, releaseDate,
          genres, runtime, voteAverage, mediaType, posterPath, posterUrl,
          backdropPath, backdropUrl, logoPath, logoUrl, networkId, networkName,
          networkLogoUrl, status, completed, platformUrl, totalEpisodes,
          manuallySetEpisodes, weekday, secondWeekday, airTime, category,
          tmdbUrl, notes, isDailyUpdate, blurIntensity, rating, createdAt, updatedAt, deletedAt
        ) VALUES (
          @id, @tmdbId, @imdbId, @title, @originalTitle, @overview, @year, @releaseDate,
          @genres, @runtime, @voteAverage, @mediaType, @posterPath, @posterUrl,
          @backdropPath, @backdropUrl, @logoPath, @logoUrl, @networkId, @networkName,
          @networkLogoUrl, @status, @completed, @platformUrl, @totalEpisodes,
          @manuallySetEpisodes, @weekday, @secondWeekday, @airTime, @category,
          @tmdbUrl, @notes, @isDailyUpdate, @blurIntensity, @rating, @createdAt, @updatedAt, @deletedAt
        )
      `);

      const insertSeason = db.prepare(`
        INSERT INTO seasons (id, itemId, seasonNumber, name, totalEpisodes, currentEpisode, createdAt, updatedAt)
        VALUES (@id, @itemId, @seasonNumber, @name, @totalEpisodes, @currentEpisode, @createdAt, @updatedAt)
      `);

      const insertEpisode = db.prepare(`
        INSERT INTO episodes (id, itemId, seasonId, seasonNumber, number, completed, createdAt, updatedAt)
        VALUES (@id, @itemId, @seasonId, @seasonNumber, @number, @completed, @createdAt, @updatedAt)
      `);

      const insertTransaction = db.transaction(() => {
        // 插入项目
        insertItem.run(row);

        // 插入季和分集
        if (item.seasons) {
          for (const season of item.seasons) {
            const seasonId = uuidv4();
            insertSeason.run({
              id: seasonId,
              itemId: item.id,
              seasonNumber: season.seasonNumber,
              name: season.name ?? null,
              totalEpisodes: season.totalEpisodes,
              currentEpisode: season.currentEpisode ?? null,
              createdAt: now,
              updatedAt: now,
            });

            // 插入该季的分集
            if (season.episodes) {
              for (const episode of season.episodes) {
                insertEpisode.run({
                  id: uuidv4(),
                  itemId: item.id,
                  seasonId: seasonId,
                  seasonNumber: season.seasonNumber,
                  number: episode.number,
                  completed: episode.completed ? 1 : 0,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            }
          }
        }

        // 插入独立分集
        if (item.episodes) {
          for (const episode of item.episodes) {
            insertEpisode.run({
              id: uuidv4(),
              itemId: item.id,
              seasonId: null,
              seasonNumber: episode.seasonNumber ?? null,
              number: episode.number,
              completed: episode.completed ? 1 : 0,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      });

      insertTransaction();

      return { success: true, data: item };
    } catch (error) {
      logger.error('[ItemsRepository] 创建项目失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      };
    }
  }

  /**
   * 更新项目
   */
  update(item: TMDBItem): DatabaseResult<TMDBItem> {
    const db = getDatabase();

    try {
      const now = new Date().toISOString();
      const row: ItemRow = tmdbItemToRow(item, { updatedAt: now });

      const updateItem = db.prepare(`
        UPDATE items SET
          tmdbId = @tmdbId,
          imdbId = @imdbId,
          title = @title,
          originalTitle = @originalTitle,
          overview = @overview,
          year = @year,
          releaseDate = @releaseDate,
          genres = @genres,
          runtime = @runtime,
          voteAverage = @voteAverage,
          mediaType = @mediaType,
          posterPath = @posterPath,
          posterUrl = @posterUrl,
          backdropPath = @backdropPath,
          backdropUrl = @backdropUrl,
          logoPath = @logoPath,
          logoUrl = @logoUrl,
          networkId = @networkId,
          networkName = @networkName,
          networkLogoUrl = @networkLogoUrl,
          status = @status,
          completed = @completed,
          platformUrl = @platformUrl,
          totalEpisodes = @totalEpisodes,
          manuallySetEpisodes = @manuallySetEpisodes,
          weekday = @weekday,
          secondWeekday = @secondWeekday,
          airTime = @airTime,
          category = @category,
          tmdbUrl = @tmdbUrl,
          notes = @notes,
          isDailyUpdate = @isDailyUpdate,
          blurIntensity = @blurIntensity,
          rating = @rating,
          updatedAt = @updatedAt
        WHERE id = @id AND deletedAt IS NULL
      `);

      const updateTransaction = db.transaction(() => {
        // 更新项目
        updateItem.run(row);

        // 删除旧的季和分集
        db.prepare('DELETE FROM episodes WHERE itemId = ?').run(item.id);
        db.prepare('DELETE FROM seasons WHERE itemId = ?').run(item.id);

        // 重新插入季和分集
        if (item.seasons) {
          const insertSeason = db.prepare(`
            INSERT INTO seasons (id, itemId, seasonNumber, name, totalEpisodes, currentEpisode, createdAt, updatedAt)
            VALUES (@id, @itemId, @seasonNumber, @name, @totalEpisodes, @currentEpisode, @createdAt, @updatedAt)
          `);

          const insertEpisode = db.prepare(`
            INSERT INTO episodes (id, itemId, seasonId, seasonNumber, number, completed, createdAt, updatedAt)
            VALUES (@id, @itemId, @seasonId, @seasonNumber, @number, @completed, @createdAt, @updatedAt)
          `);

          for (const season of item.seasons) {
            const seasonId = uuidv4();
            insertSeason.run({
              id: seasonId,
              itemId: item.id,
              seasonNumber: season.seasonNumber,
              name: season.name ?? null,
              totalEpisodes: season.totalEpisodes,
              currentEpisode: season.currentEpisode ?? null,
              createdAt: now,
              updatedAt: now,
            });

            if (season.episodes) {
              for (const episode of season.episodes) {
                insertEpisode.run({
                  id: uuidv4(),
                  itemId: item.id,
                  seasonId: seasonId,
                  seasonNumber: season.seasonNumber,
                  number: episode.number,
                  completed: episode.completed ? 1 : 0,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            }
          }
        }

        // 重新插入独立分集
        if (item.episodes) {
          const insertEpisode = db.prepare(`
            INSERT INTO episodes (id, itemId, seasonId, seasonNumber, number, completed, createdAt, updatedAt)
            VALUES (@id, @itemId, @seasonId, @seasonNumber, @number, @completed, @createdAt, @updatedAt)
          `);

          for (const episode of item.episodes) {
            insertEpisode.run({
              id: uuidv4(),
              itemId: item.id,
              seasonId: null,
              seasonNumber: episode.seasonNumber ?? null,
              number: episode.number,
              completed: episode.completed ? 1 : 0,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      });

      updateTransaction();

      return { success: true, data: item };
    } catch (error) {
      logger.error('[ItemsRepository] 更新项目失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      };
    }
  }

  /**
   * 软删除项目
   */
  softDelete(id: string): DatabaseResult {
    const db = getDatabase();
    try {
      const now = new Date().toISOString();
      const result = db
        .prepare('UPDATE items SET deletedAt = ? WHERE id = ? AND deletedAt IS NULL')
        .run(now, id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '项目不存在或已删除' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 恢复软删除的项目
   */
  restore(id: string): DatabaseResult {
    const db = getDatabase();
    try {
      const result = db
        .prepare('UPDATE items SET deletedAt = NULL, updatedAt = ? WHERE id = ?')
        .run(new Date().toISOString(), id);

      return {
        success: result.changes > 0,
        error: result.changes === 0 ? '项目不存在' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '恢复失败',
      };
    }
  }

  /**
   * 获取已删除的项目
   */
  findDeleted(): TMDBItem[] {
    const db = getDatabase();
    const items = db
      .prepare('SELECT * FROM items WHERE deletedAt IS NOT NULL ORDER BY updatedAt DESC')
      .all() as ItemRow[];

    return items.map((item) => this.loadRelations(db, item));
  }

  /**
   * 保存项目（创建或更新）
   */
  save(item: TMDBItem): DatabaseResult<TMDBItem> {
    const existing = this.findById(item.id);
    if (existing) {
      return this.update(item);
    }
    return this.create(item);
  }

  /**
   * 批量导入项目
   */
  importItems(items: TMDBItem[]): DatabaseResult<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        const existing = this.findById(item.id);
        if (existing) {
          skipped++;
          continue;
        }

        const result = this.create(item);
        if (result.success) {
          imported++;
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error(`[ItemsRepository] 导入项目失败: ${item.title}`, error);
        skipped++;
      }
    }

    logger.info(`[ItemsRepository] 导入完成: ${imported} 个项目，跳过 ${skipped} 个`);

    return { success: true, data: { imported, skipped } };
  }

  /**
   * 根据TMDB ID查找
   */
  findByTmdbId(tmdbId: string): TMDBItem | undefined {
    const db = getDatabase();
    const item = db
      .prepare('SELECT * FROM items WHERE tmdbId = ? AND deletedAt IS NULL')
      .get(tmdbId) as ItemRow | undefined;
    if (!item) return undefined;
    return this.loadRelations(db, item);
  }

  /**
   * 根据播出日查找
   */
  findByWeekday(weekday: number): TMDBItem[] {
    const db = getDatabase();
    const items = db
      .prepare(
        'SELECT * FROM items WHERE (weekday = ? OR secondWeekday = ?) AND deletedAt IS NULL ORDER BY airTime',
      )
      .all(weekday, weekday) as ItemRow[];

    return items.map((item) => this.loadRelations(db, item));
  }

  /**
   * 获取所有项目数量
   */
  getItemCount(): number {
    return this.count({ deletedAt: null } as any);
  }
}

// 导出单例
export const itemsRepository = new ItemsRepository();