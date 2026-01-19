/**
 * TMDBImporter
 * 负责执行TMDB导入操作
 */

import { TMDBItem, ScheduledTask } from '../storage';

export interface TMDBImportResult {
  success: boolean;
  importedEpisodes?: number[];
  error?: string;
}

export interface TMDBImportOptions {
  csvPath: string;
  seasonNumber: number;
  itemId: string;
  tmdbId: number;
  conflictAction: 'w' | 'y' | 'n';
  removeAirDateColumn?: boolean;
  removeRuntimeColumn?: boolean;
  removeBackdropColumn?: boolean;
}

/**
 * TMDB导入器
 * 执行TMDB导入操作，将CSV数据导入到TMDB
 */
export class TMDBImporter {
  /**
   * 执行TMDB导入
   */
  public async importToTMDB(options: TMDBImportOptions): Promise<TMDBImportResult> {
    try {
      // 验证请求参数
      if (!options.csvPath) {
        throw new Error('CSV路径为空');
      }
      if (!options.tmdbId) {
        throw new Error('TMDB ID为空');
      }
      if (!options.seasonNumber) {
        throw new Error('季数为空');
      }

      const response = await fetch('/api/tasks/execute-tmdb-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = {};
        }
        return {
          success: false,
          error: `API请求失败 (${response.status}): ${errorData.error || response.statusText}`,
        };
      }

      let result;
      try {
        const responseText = await response.text();

        if (!responseText.trim()) {
          return {
            success: false,
            error: 'API返回空响应',
          };
        }

        result = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: `API响应解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        };
      }

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'TMDB导入失败',
        };
      }

      return {
        success: true,
        importedEpisodes: result.importedEpisodes || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 从任务和项目中提取导入选项
   */
  public extractImportOptions(
    csvPath: string,
    item: TMDBItem,
    seasonNumber: number,
    task: ScheduledTask,
  ): TMDBImportOptions {
    return {
      csvPath: csvPath,
      seasonNumber: seasonNumber,
      itemId: item.id,
      tmdbId: item.tmdbId,
      conflictAction: task.action.conflictAction,
      removeAirDateColumn: task.action.removeAirDateColumn === true,
      removeRuntimeColumn: task.action.removeRuntimeColumn === true,
      removeBackdropColumn: task.action.removeBackdropColumn === true,
    };
  }

  /**
   * 验证TMDB ID
   */
  public validateTMDBId(tmdbId: number): boolean {
    return tmdbId > 0 && tmdbId < 100000000; // TMDB ID通常在这个范围内
  }

  /**
   * 验证季数
   */
  public validateSeasonNumber(seasonNumber: number): boolean {
    return seasonNumber >= 0 && seasonNumber <= 100; // 季数通常在0-100之间
  }
}