/**
 * TMDBImportWorkflow
 * 负责协调TMDB导入的完整工作流
 */

import { TMDBItem, ScheduledTask } from '../storage';
import { taskExecutionLogger } from '../task-execution-logger';
import { PlatformExtractor } from './platform-extractor';
import { CSVProcessor } from './csv-processor';
import { TMDBImporter } from './tmdb-importer';
import { EpisodeMarker } from './episode-marker';

export interface WorkflowResult {
  success: boolean;
  error?: string;
  importedEpisodes?: number[];
}

/**
 * TMDB导入工作流
 * 协调TMDB导入的完整流程：平台抓取 → CSV处理 → TMDB导入 → 集数标记
 */
export class TMDBImportWorkflow {
  private platformExtractor: PlatformExtractor;
  private csvProcessor: CSVProcessor;
  private tmdbImporter: TMDBImporter;
  private episodeMarker: EpisodeMarker;

  constructor() {
    this.platformExtractor = new PlatformExtractor();
    this.csvProcessor = new CSVProcessor();
    this.tmdbImporter = new TMDBImporter();
    this.episodeMarker = new EpisodeMarker();
  }

  /**
   * 执行完整的TMDB导入工作流
   */
  public async executeWorkflow(
    task: ScheduledTask,
    item: TMDBItem,
  ): Promise<WorkflowResult> {
    try {
      await taskExecutionLogger.addLog(
        task.id,
        '准备',
        `开始TMDB-Import工作流程: ${item.title}`,
        'info',
      );
      await taskExecutionLogger.updateProgress(task.id, 10);

      // 步骤1: 平台抓取
      await taskExecutionLogger.addLog(
        task.id,
        '步骤1',
        '正在从播出平台抓取数据...',
        'info',
      );
      await taskExecutionLogger.updateProgress(task.id, 30);

      const extractionResult = await this.platformExtractor.extractPlatformData(
        this.platformExtractor.extractOptionsFromItem(item, task.action.seasonNumber),
      );

      if (!extractionResult.success || !extractionResult.csvPath) {
        throw new Error(
          `平台抓取失败: ${extractionResult.error || '未知错误'}`,
        );
      }

      await taskExecutionLogger.addLog(
        task.id,
        '步骤1',
        '平台抓取完成',
        'success',
      );

      // 步骤2: CSV处理
      await taskExecutionLogger.addLog(
        task.id,
        '步骤2',
        '正在处理CSV文件...',
        'info',
      );
      await taskExecutionLogger.updateProgress(task.id, 50);

      const csvProcessResult = await this.csvProcessor.processCSVWithMarkedEpisodes({
        csvPath: extractionResult.csvPath,
        item: item,
        seasonNumber: task.action.seasonNumber,
        task: task,
      });

      if (!csvProcessResult.success) {
        throw new Error(
          `CSV处理失败: ${csvProcessResult.error || '未知错误'}`,
        );
      }

      await taskExecutionLogger.addLog(
        task.id,
        '步骤2',
        'CSV处理完成',
        'success',
      );

      // 步骤3: TMDB导入
      await taskExecutionLogger.addLog(
        task.id,
        '步骤3',
        '正在导入到TMDB...',
        'info',
      );
      await taskExecutionLogger.updateProgress(task.id, 70);

      const importResult = await this.tmdbImporter.importToTMDB(
        this.tmdbImporter.extractImportOptions(
          csvProcessResult.processedCsvPath!,
          item,
          task.action.seasonNumber,
          task,
        ),
      );

      if (!importResult.success) {
        throw new Error(`TMDB导入失败: ${importResult.error || '未知错误'}`);
      }

      await taskExecutionLogger.addLog(
        task.id,
        '步骤3',
        `TMDB导入完成，成功导入 ${importResult.importedEpisodes?.length || 0} 个集数`,
        'success',
      );

      // 步骤4: 集数标记
      await taskExecutionLogger.addLog(
        task.id,
        '步骤4',
        '正在标记已导入的集数...',
        'info',
      );
      await taskExecutionLogger.updateProgress(task.id, 90);

      const markingResult = await this.episodeMarker.markEpisodes({
        item: item,
        seasonNumber: task.action.seasonNumber,
        episodeNumbers: importResult.importedEpisodes || [],
      });

      if (markingResult) {
        await taskExecutionLogger.addLog(
          task.id,
          '步骤4',
          `集数标记完成，标记了 ${markingResult.markedCount} 个集数`,
          'success',
        );

        if (markingResult.projectCompleted) {
          await taskExecutionLogger.addLog(
            task.id,
            '完成',
            '项目已完结！',
            'info',
          );
        }
      }

      await taskExecutionLogger.updateProgress(task.id, 100);
      await taskExecutionLogger.addLog(
        task.id,
        '完成',
        'TMDB导入工作流程执行完成',
        'success',
      );

      return {
        success: true,
        importedEpisodes: importResult.importedEpisodes,
      };
    } catch (error) {
      await taskExecutionLogger.addLog(
        task.id,
        '错误',
        `工作流程执行失败: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 验证工作流前置条件
   */
  public validateWorkflowPreconditions(
    task: ScheduledTask,
    item: TMDBItem,
  ): { valid: boolean; error?: string } {
    // 验证平台URL
    if (!this.platformExtractor.validatePlatformUrl(item.platformUrl || '')) {
      return {
        valid: false,
        error: `项目 ${item.title} 缺少有效的平台URL`,
      };
    }

    // 验证季数
    if (task.action.seasonNumber > 0 && item.mediaType === 'tv') {
      if (
        !item.seasons ||
        !item.seasons.some((s) => s.seasonNumber === task.action.seasonNumber)
      ) {
        return {
          valid: false,
          error: `项目 ${item.title} 没有第 ${task.action.seasonNumber} 季`,
        };
      }
    }

    // 验证TMDB ID
    if (!this.tmdbImporter.validateTMDBId(item.tmdbId)) {
      return {
        valid: false,
        error: `项目 ${item.title} 的TMDB ID无效`,
      };
    }

    return { valid: true };
  }
}