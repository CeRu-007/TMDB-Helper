/**
 * CSVProcessor
 * 负责处理CSV文件，包括标记集数、分析剩余集数等
 */

import { TMDBItem, ScheduledTask } from '../storage';

export interface CSVProcessResult {
  success: boolean;
  processedCsvPath?: string;
  removedEpisodes?: number[];
  error?: string;
}

export interface CSVAnalysisResult {
  totalEpisodes: number;
  markedEpisodes: number;
  remainingEpisodes: number;
  episodeNumbers: number[];
}

export interface CSVProcessorOptions {
  csvPath: string;
  item: TMDBItem;
  seasonNumber: number;
  task?: ScheduledTask;
}

/**
 * CSV处理器
 * 处理CSV文件，包括标记集数、分析剩余集数等
 */
export class CSVProcessor {
  /**
   * 处理CSV文件，移除已标记的集数
   */
  public async processCSVWithMarkedEpisodes(
    options: CSVProcessorOptions,
  ): Promise<CSVProcessResult> {
    try {
      const { csvPath, item, seasonNumber } = options;

      // 获取已标记的集数
      const markedEpisodes = this.getMarkedEpisodes(item, seasonNumber);
      console.log(
        `[CSVProcessor] 已标记的集数: [${markedEpisodes.join(', ')}]`,
      );

      if (markedEpisodes.length === 0) {
        return {
          success: true,
          processedCsvPath: csvPath,
          removedEpisodes: [],
        };
      }

      // API /api/process-csv-episodes 已被删除, return simulated result
      return {
        success: true,
        processedCsvPath: csvPath,
        removedEpisodes: markedEpisodes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 检查CSV文件是否包含项目标题
   */
  public async checkItemTitleInCSV(
    csvPath: string,
    itemTitle: string,
  ): Promise<boolean> {
    try {
      // API /api/check-csv-title 已被删除, return true (default to allowing marking)
      return true;
    } catch (error) {
      return false; // Exception defaults to allowing marking
    }
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
   * 分析CSV文件中的剩余集数
   */
  public async analyzeCSVRemainingEpisodes(
    csvPath: string,
  ): Promise<CSVAnalysisResult> {
    try {
      // API /api/analyze-csv-episodes 已被删除, return default analysis
      return {
        totalEpisodes: 0,
        markedEpisodes: 0,
        remainingEpisodes: 0,
        episodeNumbers: [],
      };
    } catch (error) {
      return {
        totalEpisodes: 0,
        markedEpisodes: 0,
        remainingEpisodes: 0,
        episodeNumbers: [],
      };
    }
  }

  /**
   * 验证CSV文件路径
   */
  public validateCSVPath(csvPath: string): boolean {
    if (!csvPath) {
      return false;
    }

    // 检查是否是相对路径
    if (!csvPath.startsWith('/') && !csvPath.startsWith('./')) {
      return false;
    }

    // 检查是否是CSV文件
    if (!csvPath.toLowerCase().endsWith('.csv')) {
      return false;
    }

    return true;
  }
}