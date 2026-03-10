/**
 * 媒体项目 Repository
 */

import { getDatabase, transaction } from '../connection';
import { BaseRepository } from './base.repository';
import type {
  ItemRow,
  SeasonRow,
  EpisodeRow,
  DatabaseResult,
} from '../types';
import { rowToTMDBItem } from '../types';
import type { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';

export class ItemsRepository extends BaseRepository<TMDBItem, ItemRow> {
  protected tableName = 'items';

  /**
   * 获取所有项目（带季和分集信息）
   */
  findAllWithRelations(): TMDBItem[] {
    const db = getDatabase();
    const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all() as ItemRow[];

    return items.map((item) => this.loadRelations(db, item));
  }

  /**
   * 根据ID获取项目（带季和分集信息）
   */
  findByIdWithRelations(id: string): TMDBItem | undefined {
    const db = getDatabase();
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow | undefined;

    if (!item) return undefined;
    return this.loadRelations(db, item);
  }

  /**
   * 加载关联数据（季和分集）
   */
  private loadRelations(db: ReturnType<typeof getDatabase>, item: ItemRow): TMDBItem {
    // 加载季信息（带分集）
    const seasons = db
      .prepare('SELECT * FROM seasons WHERE item_id = ? ORDER BY season_number')
      .all(item.id) as SeasonRow[];

    const seasonsWithEpisodes = seasons.map((season) => {
      const episodes = db
        .prepare('SELECT * FROM episodes WHERE season_id = ? ORDER BY number')
        .all(season.id) as EpisodeRow[];
      return { ...season, episodes };
    });

    // 加载独立分集（兼容旧数据）
    const standaloneEpisodes = db
      .prepare('SELECT * FROM episodes WHERE item_id = ? AND season_id IS NULL ORDER BY number')
      .all(item.id) as EpisodeRow[];

    return rowToTMDBItem(item, seasonsWithEpisodes, standaloneEpisodes);
  }

  /**
   * 创建项目
   */
  create(item: TMDBItem): DatabaseResult<TMDBItem> {
    const db = getDatabase();

    try {
      const insertItem = db.prepare(`
        INSERT INTO items (
          id, tmdb_id, imdb_id, title, original_title, overview, year, release_date,
          genres, runtime, vote_average, media_type, poster_path, poster_url,
          backdrop_path, backdrop_url, logo_path, logo_url, network_id, network_name,
          network_logo_url, status, completed, platform_url, total_episodes,
          manually_set_episodes, weekday, second_weekday, air_time, category,
          tmdb_url, notes, is_daily_update, blur_intensity, rating, created_at, updated_at
        ) VALUES (
          @id, @tmdb_id, @imdb_id, @title, @original_title, @overview, @year, @release_date,
          @genres, @runtime, @vote_average, @media_type, @poster_path, @poster_url,
          @backdrop_path, @backdrop_url, @logo_path, @logo_url, @network_id, @network_name,
          @network_logo_url, @status, @completed, @platform_url, @total_episodes,
          @manually_set_episodes, @weekday, @second_weekday, @air_time, @category,
          @tmdb_url, @notes, @is_daily_update, @blur_intensity, @rating, @created_at, @updated_at
        )
      `);

      const row: ItemRow = {
        id: item.id,
        tmdb_id: item.tmdbId ?? null,
        imdb_id: item.imdbId ?? null,
        title: item.title,
        original_title: item.originalTitle ?? null,
        overview: item.overview ?? null,
        year: item.year ?? null,
        release_date: item.releaseDate ?? null,
        genres: item.genres ? JSON.stringify(item.genres) : null,
        runtime: item.runtime ?? null,
        vote_average: item.voteAverage ?? null,
        media_type: item.mediaType ?? 'tv',
        poster_path: item.posterPath ?? null,
        poster_url: item.posterUrl ?? null,
        backdrop_path: item.backdropPath ?? null,
        backdrop_url: item.backdropUrl ?? null,
        logo_path: item.logoPath ?? null,
        logo_url: item.logoUrl ?? null,
        network_id: item.networkId ?? null,
        network_name: item.networkName ?? null,
        network_logo_url: item.networkLogoUrl ?? null,
        status: item.status ?? null,
        completed: item.completed ? 1 : 0,
        platform_url: item.platformUrl ?? null,
        total_episodes: item.totalEpisodes ?? null,
        manually_set_episodes: item.manuallySetEpisodes ? 1 : 0,
        weekday: item.weekday ?? null,
        second_weekday: item.secondWeekday ?? null,
        air_time: item.airTime ?? null,
        category: item.category ?? null,
        tmdb_url: item.tmdbUrl ?? null,
        notes: item.notes ?? null,
        is_daily_update: item.isDailyUpdate ? 1 : 0,
        blur_intensity: item.blurIntensity ?? null,
        rating: item.rating ?? null,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      };

      const insertSeason = db.prepare(`
        INSERT INTO seasons (item_id, season_number, name, total_episodes, current_episode)
        VALUES (@item_id, @season_number, @name, @total_episodes, @current_episode)
      `);

      const insertEpisode = db.prepare(`
        INSERT INTO episodes (item_id, season_id, season_number, number, completed)
        VALUES (@item_id, @season_id, @season_number, @number, @completed)
      `);

      const insertTransaction = db.transaction(() => {
        // 插入项目
        insertItem.run(row);

        // 插入季和分集
        if (item.seasons) {
          for (const season of item.seasons) {
            const seasonResult = insertSeason.run({
              item_id: item.id,
              season_number: season.seasonNumber,
              name: season.name ?? null,
              total_episodes: season.totalEpisodes,
              current_episode: season.currentEpisode ?? null,
            });

            const seasonId = seasonResult.lastInsertRowid;

            // 插入该季的分集
            if (season.episodes) {
              for (const episode of season.episodes) {
                insertEpisode.run({
                  item_id: item.id,
                  season_id: seasonId,
                  season_number: season.seasonNumber,
                  number: episode.number,
                  completed: episode.completed ? 1 : 0,
                });
              }
            }
          }
        }

        // 插入独立分集
        if (item.episodes) {
          for (const episode of item.episodes) {
            insertEpisode.run({
              item_id: item.id,
              season_id: null,
              season_number: episode.seasonNumber ?? null,
              number: episode.number,
              completed: episode.completed ? 1 : 0,
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
      const updateItem = db.prepare(`
        UPDATE items SET
          tmdb_id = @tmdb_id,
          imdb_id = @imdb_id,
          title = @title,
          original_title = @original_title,
          overview = @overview,
          year = @year,
          release_date = @release_date,
          genres = @genres,
          runtime = @runtime,
          vote_average = @vote_average,
          media_type = @media_type,
          poster_path = @poster_path,
          poster_url = @poster_url,
          backdrop_path = @backdrop_path,
          backdrop_url = @backdrop_url,
          logo_path = @logo_path,
          logo_url = @logo_url,
          network_id = @network_id,
          network_name = @network_name,
          network_logo_url = @network_logo_url,
          status = @status,
          completed = @completed,
          platform_url = @platform_url,
          total_episodes = @total_episodes,
          manually_set_episodes = @manually_set_episodes,
          weekday = @weekday,
          second_weekday = @second_weekday,
          air_time = @air_time,
          category = @category,
          tmdb_url = @tmdb_url,
          notes = @notes,
          is_daily_update = @is_daily_update,
          blur_intensity = @blur_intensity,
          rating = @rating,
          updated_at = @updated_at
        WHERE id = @id
      `);

      const row: ItemRow = {
        id: item.id,
        tmdb_id: item.tmdbId ?? null,
        imdb_id: item.imdbId ?? null,
        title: item.title,
        original_title: item.originalTitle ?? null,
        overview: item.overview ?? null,
        year: item.year ?? null,
        release_date: item.releaseDate ?? null,
        genres: item.genres ? JSON.stringify(item.genres) : null,
        runtime: item.runtime ?? null,
        vote_average: item.voteAverage ?? null,
        media_type: item.mediaType ?? 'tv',
        poster_path: item.posterPath ?? null,
        poster_url: item.posterUrl ?? null,
        backdrop_path: item.backdropPath ?? null,
        backdrop_url: item.backdropUrl ?? null,
        logo_path: item.logoPath ?? null,
        logo_url: item.logoUrl ?? null,
        network_id: item.networkId ?? null,
        network_name: item.networkName ?? null,
        network_logo_url: item.networkLogoUrl ?? null,
        status: item.status ?? null,
        completed: item.completed ? 1 : 0,
        platform_url: item.platformUrl ?? null,
        total_episodes: item.totalEpisodes ?? null,
        manually_set_episodes: item.manuallySetEpisodes ? 1 : 0,
        weekday: item.weekday ?? null,
        second_weekday: item.secondWeekday ?? null,
        air_time: item.airTime ?? null,
        category: item.category ?? null,
        tmdb_url: item.tmdbUrl ?? null,
        notes: item.notes ?? null,
        is_daily_update: item.isDailyUpdate ? 1 : 0,
        blur_intensity: item.blurIntensity ?? null,
        rating: item.rating ?? null,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      };

      const updateTransaction = db.transaction(() => {
        // 更新项目
        updateItem.run(row);

        // 删除旧的季和分集
        db.prepare('DELETE FROM episodes WHERE item_id = ?').run(item.id);
        db.prepare('DELETE FROM seasons WHERE item_id = ?').run(item.id);

        // 重新插入季和分集
        if (item.seasons) {
          const insertSeason = db.prepare(`
            INSERT INTO seasons (item_id, season_number, name, total_episodes, current_episode)
            VALUES (@item_id, @season_number, @name, @total_episodes, @current_episode)
          `);

          const insertEpisode = db.prepare(`
            INSERT INTO episodes (item_id, season_id, season_number, number, completed)
            VALUES (@item_id, @season_id, @season_number, @number, @completed)
          `);

          for (const season of item.seasons) {
            const seasonResult = insertSeason.run({
              item_id: item.id,
              season_number: season.seasonNumber,
              name: season.name ?? null,
              total_episodes: season.totalEpisodes,
              current_episode: season.currentEpisode ?? null,
            });

            const seasonId = seasonResult.lastInsertRowid;

            if (season.episodes) {
              for (const episode of season.episodes) {
                insertEpisode.run({
                  item_id: item.id,
                  season_id: seasonId,
                  season_number: season.seasonNumber,
                  number: episode.number,
                  completed: episode.completed ? 1 : 0,
                });
              }
            }
          }
        }

        // 重新插入独立分集
        if (item.episodes) {
          const insertEpisode = db.prepare(`
            INSERT INTO episodes (item_id, season_id, season_number, number, completed)
            VALUES (@item_id, @season_id, @season_number, @number, @completed)
          `);

          for (const episode of item.episodes) {
            insertEpisode.run({
              item_id: item.id,
              season_id: null,
              season_number: episode.seasonNumber ?? null,
              number: episode.number,
              completed: episode.completed ? 1 : 0,
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
    const db = getDatabase();
    let imported = 0;
    let skipped = 0;

    const importTransaction = db.transaction(() => {
      for (const item of items) {
        try {
          // 检查是否已存在
          const existing = this.findById(item.id);
          if (existing) {
            skipped++;
            continue;
          }

          this.create(item);
          imported++;
        } catch (error) {
          logger.error(`[ItemsRepository] 导入项目失败: ${item.title}`, error);
          skipped++;
        }
      }
    });

    importTransaction();

    logger.info(`[ItemsRepository] 导入完成: ${imported} 个项目，跳过 ${skipped} 个`);

    return { success: true, data: { imported, skipped } };
  }

  /**
   * 根据TMDB ID查找
   */
  findByTmdbId(tmdbId: string): TMDBItem | undefined {
    const db = getDatabase();
    const item = db.prepare('SELECT * FROM items WHERE tmdb_id = ?').get(tmdbId) as ItemRow | undefined;
    if (!item) return undefined;
    return this.loadRelations(db, item);
  }

  /**
   * 根据播出日查找
   */
  findByWeekday(weekday: number): TMDBItem[] {
    const db = getDatabase();
    const items = db
      .prepare('SELECT * FROM items WHERE weekday = ? OR second_weekday = ? ORDER BY air_time')
      .all(weekday, weekday) as ItemRow[];

    return items.map((item) => this.loadRelations(db, item));
  }

  /**
   * 获取所有项目数量
   */
  getItemCount(): number {
    return this.count();
  }
}

// 导出单例
export const itemsRepository = new ItemsRepository();
