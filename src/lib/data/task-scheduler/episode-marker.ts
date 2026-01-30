/**
 * EpisodeMarker
 * 负责标记剧集集数为已完成
 */

import { TMDBItem } from '../storage';
import { StorageManager } from '../storage';
import { logger } from '@/lib/utils/logger';

export interface EpisodeMarkingResult {
  success: boolean;
  markedCount: number;
  projectCompleted: boolean;
}

export interface EpisodeMarkingOptions {
  item: TMDBItem;
  seasonNumber: number;
  episodeNumbers: number[];
}

/**
 * 集数标记器
 * 将指定集数标记为已完成
 */
export class EpisodeMarker {
  /**
   * 标记集数为已完成
   */
  public async markEpisodes(
    options: EpisodeMarkingOptions,
  ): Promise<EpisodeMarkingResult | null> {
    try {
      const { item, seasonNumber, episodeNumbers } = options;

      logger.debug('EpisodeMarker', `直接标记集数为已完成`, {
        title: item.title,
        season: seasonNumber,
        episodes: episodeNumbers
      });

      // 获取最新的项目数据
      const allItems = await StorageManager.getItemsWithRetry();
      let targetItem = allItems.find((i) => i.id === item.id);

      if (!targetItem) {
        // 尝试通过标题查找
        targetItem = allItems.find((i) => i.title === item.title);
        if (targetItem) {
          logger.debug('EpisodeMarker', `通过标题找到项目: ${targetItem.title}`, { id: targetItem.id });
        } else {
          logger.error('EpisodeMarker', `无法找到项目: ${item.title}`);
          return null;
        }
      }

      // 找到对应的季
      const season = targetItem.seasons?.find((s) => s.seasonNumber === seasonNumber);
      if (!season) {
        logger.error('EpisodeMarker', `项目 ${targetItem.title} 没有第 ${seasonNumber} 季`);
        return null;
      }

      // 标记集数
      let markedCount = 0;
      episodeNumbers.forEach((epNumber) => {
        const existingMarked = season.markedEpisodes?.find(
          (marked) => marked.episodeNumber === epNumber,
        );
        if (!existingMarked) {
          season.markedEpisodes = season.markedEpisodes || [];
          season.markedEpisodes.push({
            episodeNumber: epNumber,
            markedAt: new Date().toISOString(),
          });
          markedCount++;
        }
      });

      if (markedCount > 0) {
        // 更新项目
        const updateSuccess = await StorageManager.updateItem(targetItem);
        if (updateSuccess) {
          logger.info('EpisodeMarker', `成功标记 ${markedCount} 个集数`, {
            episodes: episodeNumbers
          });
        } else {
          logger.error('EpisodeMarker', `更新项目失败: ${targetItem.title}`);
          return null;
        }
      } else {
        logger.debug('EpisodeMarker', '所有集数都已标记，无需重复标记');
      }

      // 检查项目是否完成
      const projectCompleted = this.checkProjectCompleted(targetItem, seasonNumber);

      return {
        success: true,
        markedCount,
        projectCompleted,
      };
    } catch (error) {
      logger.error('EpisodeMarker', '标记集数时出错', error);
      return null;
    }
  }

  /**
   * 检查项目是否完成
   */
  private checkProjectCompleted(item: TMDBItem, seasonNumber: number): boolean {
    const season = item.seasons?.find((s) => s.seasonNumber === seasonNumber);
    if (!season) {
      return false;
    }

    // 检查媒体类型
    if (item.mediaType === 'tv' && season.numberOfEpisodes) {
      // 电视剧：检查是否所有集数都已标记
      return season.markedEpisodes?.length === season.numberOfEpisodes;
    } else if (item.mediaType === 'movie') {
      // 电影：只要有标记就认为完成
      return season.markedEpisodes && season.markedEpisodes.length > 0;
    }

    return false;
  }

  /**
   * 获取已标记的集数
   */
  public getMarkedEpisodes(item: TMDBItem, seasonNumber: number): number[] {
    const season = item.seasons?.find((s) => s.seasonNumber === seasonNumber);
    if (!season || !season.markedEpisodes) {
      return [];
    }

    return season.markedEpisodes.map((ep) => ep.episodeNumber);
  }

  /**
   * 获取未标记的集数
   */
  public getUnmarkedEpisodes(item: TMDBItem, seasonNumber: number): number[] {
    const season = item.seasons?.find((s) => s.seasonNumber === seasonNumber);
    if (!season) {
      return [];
    }

    if (!season.numberOfEpisodes) {
      return [];
    }

    const markedEpisodes = this.getMarkedEpisodes(item, seasonNumber);
    const allEpisodes = Array.from({ length: season.numberOfEpisodes }, (_, i) => i + 1);

    return allEpisodes.filter((ep) => !markedEpisodes.includes(ep));
  }

  /**
   * 清除所有标记
   */
  public async clearAllMarks(item: TMDBItem, seasonNumber: number): Promise<boolean> {
    try {
      const season = item.seasons?.find((s) => s.seasonNumber === seasonNumber);
      if (!season) {
        return false;
      }

      season.markedEpisodes = [];
      return await StorageManager.updateItem(item);
    } catch (error) {
      logger.error('EpisodeMarker', '清除标记时出错', error);
      return false;
    }
  }
}