import { StorageManager, ScheduledTask, TMDBItem } from '../storage';
import { taskExecutionLogger } from '../task-execution-logger';
import {
  BrowserInterruptDetector,
  BrowserInterruptResult,
} from '@/lib/utils/browser-interrupt-detector';
import { DistributedLock } from '@/lib/utils/distributed-lock';
import { realtimeSyncManager } from '../realtime-sync-manager';

/**
 * TaskExecutor - Handles the execution logic for scheduled tasks
 * This class is responsible for:
 * - Task execution with retry logic
 * - Task association with projects
 * - TMDB import workflow execution
 * - Error handling and logging
 */
export class TaskExecutor {
  private currentExecution: Set<string> = new Set(); // 跟踪当前正在执行的任务

  /**
   * Execute scheduled task with retry mechanism
   */
  public async executeTaskWithRetry(
    task: ScheduledTask,
    retryCount: number = 0,
  ): Promise<void> {
    const maxRetries = 3;
    const currentTime = new Date().toLocaleString('zh-CN');
    console.log(
      `[TaskExecutor] 准备执行任务: ${task.id} (${task.name}) 在 ${currentTime} (重试次数: ${retryCount})`,
    );

    // If task is already executing, skip this execution
    if (this.currentExecution.has(task.id)) {
      console.warn(
        `[TaskExecutor] 任务 ${task.id} (${task.name}) 已在执行中，跳过本次执行`,
      );
      return;
    }

    // Check if task is still enabled
    if (!task.enabled) {
      console.warn(
        `[TaskExecutor] 任务 ${task.id} (${task.name}) 已禁用，跳过执行`,
      );
      return;
    }

    try {
      await this._executeTaskInternal(task);
    } catch (error) {
      console.error(`[TaskExecutor] 任务执行失败: ${task.name}`, error);
      // If there are retries left, retry after delay
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 60000; // Exponential backoff: 1min, 2min, 4min
        console.log(
          `[TaskExecutor] 将在 ${retryDelay / 60000} 分钟后重试任务: ${task.name} (第${retryCount + 1}次重试)`,
        );

        setTimeout(() => {
          this.executeTaskWithRetry(task, retryCount + 1);
        }, retryDelay);
      } else {
        console.error(`[TaskExecutor] 任务 ${task.name} 所有重试都失败了`);
      }
    }
  }

  /**
   * Internal task execution implementation
   */
  private async _executeTaskInternal(task: ScheduledTask): Promise<void> {
    // Get distributed lock
    const lockKey = `task_${task.id}`;
    const lockResult = await DistributedLock.acquireLock(
      lockKey,
      'task_execution',
      10 * 60 * 1000,
    ); // 10分钟超时

    if (!lockResult.success) {
      console.warn(
        `[TaskExecutor] 任务 ${task.id} (${task.name}) 获取锁失败，可能已在其他进程中执行`,
      );
      return;
    }

    // Mark task as executing
    this.currentExecution.add(task.id);

    try {
      // Start execution logging
      try {
        await taskExecutionLogger.startTaskExecution(task.id);
      } catch (logError) {
        console.warn(`[TaskExecutor] 启动执行日志记录失败:`, logError);
      }

      try {
        await taskExecutionLogger.addLog(
          task.id,
          '初始化',
          `开始执行任务: ${task.name}`,
          'info',
        );
      } catch (logError) {
        console.warn(`[TaskExecutor] 记录初始化日志失败:`, logError);
      }

      // Update task's last execution time
      const updatedTask = { ...task, lastRun: new Date().toISOString() };
      await StorageManager.updateScheduledTask(updatedTask);

      try {
        await taskExecutionLogger.updateProgress(task.id, 5);
      } catch (logError) {
        console.warn(`[TaskExecutor] 更新进度失败:`, logError);
      }

      // Execute TMDB-Import task
      if (task.type === 'tmdb-import') {
        await this.executeTMDBImportTask(task);
      } else {
        console.warn(`[TaskExecutor] 未知任务类型: ${task.type}`);
      }
    } catch (error) {
      console.error(`[TaskExecutor] 执行任务时发生错误: ${task.name}`, error);
      throw error;
    } finally {
      // Release distributed lock
      await DistributedLock.releaseLock(lockKey);

      // Always clean up execution state
      this.currentExecution.delete(task.id);
    }
  }

  /**
   * Execute TMDB-Import task - New complete workflow
   */
  private async executeTMDBImportTask(task: ScheduledTask): Promise<void> {
    // First get the associated item
    const relatedItem = await this.getRelatedItem(task);

    if (!relatedItem) {
      console.error(`[TaskExecutor] 无法找到任务关联的项目: ${task.id}`);
      throw new Error(`找不到任务关联的项目 (itemId: ${task.itemId})`);
    }

    // Validate basic conditions
    if (!relatedItem.platformUrl) {
      throw new Error(
        `项目 ${relatedItem.title} 缺少平台URL，无法执行TMDB导入`,
      );
    }

    if (task.action.seasonNumber > 0 && relatedItem.mediaType === 'tv') {
      if (
        !relatedItem.seasons ||
        !relatedItem.seasons.some(
          (s) => s.seasonNumber === task.action.seasonNumber,
        )
      ) {
        throw new Error(
          `项目 ${relatedItem.title} 没有第 ${task.action.seasonNumber} 季，请检查季数设置`,
        );
      }
    }

    // Execute import workflow
    await this.executeImportWorkflow(task, relatedItem);
  }

  /**
   * Execute the complete import workflow
   */
  private async executeImportWorkflow(
    task: ScheduledTask,
    item: TMDBItem,
  ): Promise<void> {
    try {
      // Step 1: Platform extraction
      await taskExecutionLogger.addLog(
        task.id,
        '准备',
        `开始TMDB-Import工作流程: ${item.title}`,
        'info',
      );
      await taskExecutionLogger.updateProgress(task.id, 10);

      // Step 1: Platform extraction
      const extractResult = await this.executePlatformExtraction(
        item,
        task.action.seasonNumber,
      );
      if (!extractResult.success) {
        throw new Error(`播出平台抓取失败: ${extractResult.error}`);
      }

      // Step 2: Process CSV with marked episodes
      const csvProcessResult = await this.processCSVWithMarkedEpisodes(
        extractResult.csvPath!,
        item,
        task.action.seasonNumber,
        task,
      );

      if (!csvProcessResult.success) {
        throw new Error(`CSV处理失败: ${csvProcessResult.error}`);
      }

      // Check if CSV still contains item titles (for auto-marking)
      let hasItemTitleInCSV = true;
      if (task.action.enableTitleCleaning !== false) {
        hasItemTitleInCSV = await this.checkItemTitleInCSV(
          csvProcessResult.processedCsvPath!,
          item.title,
        );
      }

      // Step 3: Execute TMDB import
      const importResult = await this.executeTMDBImport(
        csvProcessResult.processedCsvPath!,
        item,
        task.action.seasonNumber,
        task.action.conflictAction || 'w',
        task,
      );

      if (!importResult.success) {
        throw new Error(`TMDB导入失败: ${importResult.error}`);
      }

      // Step 4: Conditional episode marking (only if no item title in CSV)
      if (!hasItemTitleInCSV) {
        await this.handleEpisodeMarking(
          item,
          task.action.seasonNumber,
          csvProcessResult,
        );
      }

      // Update task status to success
      const successTask = {
        ...task,
        lastRunStatus: 'success' as const,
        lastRunError: null,
      };
      await StorageManager.updateScheduledTask(successTask);

      // Send real-time sync notification
      try {
        await realtimeSyncManager.notifyDataChange({
          type: 'task_completed',
          data: {
            taskId: task.id,
            taskName: task.name,
            itemId: task.itemId,
            itemTitle: item?.title,
            completedAt: new Date().toISOString(),
          },
        });
      } catch (syncError) {
        console.warn(`[TaskExecutor] 发送实时同步通知失败:`, syncError);
      }
    } catch (error) {
      // Handle import error
      await this.handleImportError(task, error);
    }
  }

  /**
   * Handle import error
   */
  private async handleImportError(
    task: ScheduledTask,
    error: any,
  ): Promise<void> {
    const interruptResult = BrowserInterruptDetector.analyzeError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (interruptResult.isUserInterrupted) {
      // User interrupted: log as user action, not as error
      const userMessage =
        BrowserInterruptDetector.generateUserFriendlyMessage(interruptResult);
      await taskExecutionLogger.addLog(
        task.id,
        '用户中断',
        userMessage,
        'warning',
      );

      const interruptedTask = {
        ...task,
        lastRunStatus: 'user_interrupted' as const,
        lastRunError: userMessage,
      };
      await StorageManager.updateScheduledTask(interruptedTask);
      await taskExecutionLogger.endTaskExecution(task.id, false, userMessage);
    } else {
      // System error: handle as regular error
      await taskExecutionLogger.addLog(
        task.id,
        '错误',
        `任务执行失败: ${errorMessage}`,
        'error',
      );
      const failedTask = {
        ...task,
        lastRunStatus: 'failed' as const,
        lastRunError: errorMessage,
      };
      await StorageManager.updateScheduledTask(failedTask);
      await taskExecutionLogger.endTaskExecution(task.id, false, errorMessage);
    }

    // Re-throw error for outer catch
    throw error;
  }

  /**
   * Get related item with multiple fallback strategies
   */
  private async getRelatedItem(task: ScheduledTask): Promise<TMDBItem | null> {
    try {
      const relatedItem: TMDBItem | null = null;
      const items = await StorageManager.getItemsWithRetry();

      if (items.length === 0) {
        console.warn(`[TaskExecutor] 系统中没有可用项目，请先添加项目`);
        throw new Error(`系统中没有可用项目，请先添加项目`);
      }

      // Strategy 1: Direct ID match
      const foundItem = items.find((item) => item.id === task.itemId);
      if (foundItem) {
        console.log(
          `[TaskExecutor] 直接通过ID找到了项目: ${foundItem.title} (ID: ${foundItem.id})`,
        );
        return foundItem;
      }

      // Strategy 2: By TMDB ID
      if (task.itemTmdbId) {
        const tmdbMatch = items.find((item) => item.tmdbId === task.itemTmdbId);
        if (tmdbMatch) {
          console.log(
            `[TaskExecutor] 通过TMDB ID找到了项目: ${tmdbMatch.title} (ID: ${tmdbMatch.id})`,
          );
          await this.updateTaskItemId(task.id, tmdbMatch.id);
          return tmdbMatch;
        }
      }

      // Strategy 3: By title exact match
      if (task.itemTitle) {
        const titleMatch = items.find((item) => item.title === task.itemTitle);
        if (titleMatch) {
          console.log(
            `[TaskExecutor] 通过标题精确匹配找到了项目: ${titleMatch.title} (ID: ${titleMatch.id})`,
          );
          await this.updateTaskItemId(task.id, titleMatch.id);
          return titleMatch;
        }
      }

      // Strategy 4: By title fuzzy match
      if (task.itemTitle) {
        const possibleItems = items.filter(
          (item) =>
            (item.title.includes(task.itemTitle) &&
              item.title.length - task.itemTitle.length < 10) ||
            (task.itemTitle.includes(item.title) &&
              task.itemTitle.length - item.title.length < 10),
        );

        if (possibleItems.length > 0) {
          if (possibleItems.length === 1) {
            const matchItem = possibleItems[0];
            console.log(
              `[TaskExecutor] 选择唯一的模糊匹配项: ${matchItem.title} (ID: ${matchItem.id})`,
            );
            await this.updateTaskItemId(task.id, matchItem.id);
            return matchItem;
          }

          // If multiple matches, try to find the one with closest creation time
          const sameTypeItems = [...possibleItems].sort(
            (a, b) =>
              Math.abs(
                new Date(a.createdAt).getTime() -
                  new Date(task.createdAt).getTime(),
              ) -
              Math.abs(
                new Date(b.createdAt).getTime() -
                  new Date(task.createdAt).getTime(),
              ),
          );
          const bestMatch = sameTypeItems[0];
          console.log(
            `[TaskExecutor] 从多个同类型候选项中选择创建时间最接近的: ${bestMatch.title} (ID: ${bestMatch.id})`,
          );
          await this.updateTaskItemId(task.id, bestMatch.id);
          return bestMatch;
        }
      }

      // If all strategies fail, return null
      console.warn(
        `[TaskExecutor] 无法找到任务 ${task.id} (${task.name}) 的关联项目，所有匹配策略均失败`,
      );
      return null;
    } catch (error) {
      console.error(`[TaskExecutor] 获取关联项目时出错:`, error);
      return null;
    }
  }

  /**
   * Update task's itemId
   */
  private async updateTaskItemId(
    taskId: string,
    newItemId: string,
  ): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const taskIndex = tasks.findIndex((t) => t.id === taskId);

      if (taskIndex !== -1) {
        tasks[taskIndex].itemId = newItemId;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        await StorageManager.updateScheduledTask(tasks[taskIndex]);
      }
    } catch (error) {
      console.warn(`[TaskExecutor] 更新任务ID失败:`, error);
    }
  }

  /**
   * Execute platform extraction - Step 1
   */
  private async executePlatformExtraction(
    item: TMDBItem,
    seasonNumber: number,
  ): Promise<{
    success: boolean;
    csvPath?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/tasks/execute-platform-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformUrl: item.platformUrl,
          seasonNumber: seasonNumber,
          itemId: item.id,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = {};
        }
        throw new Error(
          `API请求失败 (${response.status}): ${errorData.error || response.statusText}`,
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '播出平台抓取失败');
      }

      return {
        success: true,
        csvPath: result.csvPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process CSV with marked episodes - Step 2
   */
  private async processCSVWithMarkedEpisodes(
    csvPath: string,
    item: TMDBItem,
    seasonNumber: number,
    task: ScheduledTask,
  ): Promise<{
    success: boolean;
    processedCsvPath?: string;
    removedEpisodes?: number[];
    error?: string;
  }> {
    try {
      // Get marked episodes (using the passed latest item data)
      const markedEpisodes = this.getMarkedEpisodes(item, seasonNumber);
      console.log(
        `[TaskExecutor] 已标记的集数: [${markedEpisodes.join(', ')}]`,
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
   * Get marked episodes
   */
  private getMarkedEpisodes(item: TMDBItem, seasonNumber: number): number[] {
    const markedEpisodes: number[] = [];

    if (item.seasons && item.seasons.length > 0) {
      // Multi-season mode
      const targetSeason = item.seasons.find(
        (s) => s.seasonNumber === seasonNumber,
      );

      if (targetSeason) {
        if (targetSeason.episodes) {
          targetSeason.episodes.forEach((episode) => {
            if (episode.completed) {
              markedEpisodes.push(episode.number);
            }
          });
        }
      }
    } else if (item.episodes) {
      // Single season mode
      item.episodes.forEach((episode) => {
        if (episode.completed) {
          markedEpisodes.push(episode.number);
        }
      });
    }

    const sortedEpisodes = markedEpisodes.sort((a, b) => a - b);
    return sortedEpisodes;
  }

  /**
   * Check if CSV file still contains item titles
   */
  private async checkItemTitleInCSV(
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
   * Execute TMDB import - Step 3
   */
  private async executeTMDBImport(
    csvPath: string,
    item: TMDBItem,
    seasonNumber: number,
    conflictAction: 'w' | 'y' | 'n' = 'w',
    task?: ScheduledTask,
  ): Promise<{
    success: boolean;
    importedEpisodes?: number[];
    error?: string;
  }> {
    try {
      const requestBody = {
        csvPath: csvPath,
        seasonNumber: seasonNumber,
        itemId: item.id,
        tmdbId: item.tmdbId,
        conflictAction: conflictAction,
        // Add advanced options
        removeAirDateColumn: task?.action.removeAirDateColumn === true,
        removeRuntimeColumn: task?.action.removeRuntimeColumn === true,
        removeBackdropColumn: task?.action.removeBackdropColumn === true,
      };

      // Validate request body
      if (!requestBody.csvPath) {
        throw new Error('CSV路径为空');
      }
      if (!requestBody.tmdbId) {
        throw new Error('TMDB ID为空');
      }
      if (!requestBody.seasonNumber) {
        throw new Error('季数为空');
      }

      const response = await fetch('/api/tasks/execute-tmdb-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      return this.handleTMDBImportError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Handle TMDB import error
   */
  private handleTMDBImportError(error: Error): {
    success: false;
    error: string;
  } {
    let errorMessage = error.message;

    // Provide friendly hints for common errors
    if (error.name === 'AbortError') {
      errorMessage = 'TMDB导入超时，任务已停止';
    } else if (error.message.includes('500')) {
      errorMessage = '服务器暂时不可用，任务已停止';
    } else if (
      error.message.includes('network') ||
      error.message.includes('fetch')
    ) {
      errorMessage = '网络连接问题，任务已停止';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * Handle episode marking - Step 4
   */
  private async handleEpisodeMarking(
    item: TMDBItem,
    seasonNumber: number,
    csvProcessResult: any,
  ): Promise<void> {
    try {
      const csvAnalysisResult = await this.analyzeCSVRemainingEpisodes(
        csvProcessResult.processedCsvPath!,
      );

      if (
        csvAnalysisResult.success &&
        csvAnalysisResult.remainingEpisodes &&
        csvAnalysisResult.remainingEpisodes.length > 0
      ) {
        console.log(
          `[TaskExecutor] CSV中剩余的集数（即成功导入的集数）: [${csvAnalysisResult.remainingEpisodes.join(', ')}]`,
        );

        // Mark episodes directly in scheduler
        const markingResult = await this.markEpisodesDirectly(
          item,
          seasonNumber,
          csvAnalysisResult.remainingEpisodes,
        );

        if (markingResult) {
          // Check if project is completed and auto-delete is enabled
          if (
            markingResult.projectCompleted &&
            task.action.autoDeleteWhenCompleted !== false
          ) {
            console.log(
              `[TaskExecutor] 项目已完结，将删除定时任务: ${task.name}`,
            );
            await this.deleteCompletedTask(task);
          }
        }
      }
    } catch (error) {
      console.warn(`[TaskExecutor] 处理集数标记时出错:`, error);
    }
  }

  /**
   * Analyze CSV for remaining episodes
   */
  private async analyzeCSVRemainingEpisodes(csvPath: string): Promise<{
    success: boolean;
    remainingEpisodes?: number[];
    error?: string;
  }> {
    try {
      // API /api/analyze-csv-episodes 已被删除, return simulated result
      return {
        success: true,
        remainingEpisodes: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Mark episodes as completed directly in storage
   */
  private async markEpisodesDirectly(
    item: TMDBItem,
    seasonNumber: number,
    episodeNumbers: number[],
  ): Promise<{
    success: boolean;
    markedCount: number;
    projectCompleted: boolean;
  } | null> {
    try {
      console.log(
        `[TaskExecutor] 直接标记集数为已完成: 项目="${item.title}", 季=${seasonNumber}, 集数=[${episodeNumbers.join(', ')}]`,
      );

      // Get the latest item data
      const allItems = await StorageManager.getItemsWithRetry();
      let targetItem = allItems.find((i) => i.id === item.id);

      if (!targetItem) {
        // Try by title
        targetItem = allItems.find((i) => i.title === item.title);
        if (targetItem) {
          console.log(
            `[TaskExecutor] 通过标题找到项目: ${targetItem.title} (ID: ${targetItem.id})`,
          );
        } else {
          console.error(`[TaskExecutor] 无法找到项目: ${item.title}`);
          return null;
        }
      }

      // Create item copy to avoid direct modification
      const updatedItem = JSON.parse(JSON.stringify(targetItem));
      let markedCount = 0;

      if (updatedItem.seasons && updatedItem.seasons.length > 0) {
        // Multi-season mode
        const targetSeason = updatedItem.seasons.find(
          (s) => s.seasonNumber === seasonNumber,
        );

        if (!targetSeason) {
          console.error(`[TaskExecutor] 未找到第 ${seasonNumber} 季`);
          return null;
        }

        if (!targetSeason.episodes) {
          targetSeason.episodes = [];
        }

        // Mark specified episodes as completed
        episodeNumbers.forEach((episodeNum) => {
          let episode = targetSeason.episodes!.find(
            (e) => e.number === episodeNum,
          );

          if (!episode) {
            // If episode doesn't exist, create new episode record
            episode = {
              number: episodeNum,
              completed: false,
              seasonNumber: seasonNumber,
            };
            targetSeason.episodes!.push(episode);
          }

          if (!episode.completed) {
            episode.completed = true;
            markedCount++;
          }
        });

        // Sort by episode number
        targetSeason.episodes.sort((a, b) => a.number - b.number);
      } else if (updatedItem.episodes) {
        // Single season mode
        episodeNumbers.forEach((episodeNum) => {
          let episode = updatedItem.episodes!.find(
            (e) => e.number === episodeNum,
          );

          if (!episode) {
            // If episode doesn't exist, create new episode record
            episode = {
              number: episodeNum,
              completed: false,
            };
            updatedItem.episodes!.push(episode);
          }

          if (!episode.completed) {
            episode.completed = true;
            markedCount++;
          }
        });

        // Sort by episode number
        updatedItem.episodes.sort((a, b) => a.number - b.number);
      } else {
        console.error(
          `[TaskExecutor] 项目 ${updatedItem.title} 没有有效的季数或集数数据`,
        );
        return null;
      }

      // Check if all episodes are completed, update project status
      let allCompleted = false;
      if (updatedItem.seasons && updatedItem.seasons.length > 0) {
        // Multi-season mode: check all seasons and episodes
        allCompleted = updatedItem.seasons.every(
          (season) =>
            season.episodes &&
            season.episodes.length > 0 &&
            season.episodes.every((ep) => ep.completed),
        );
      } else if (updatedItem.episodes) {
        // Single season mode: check all episodes
        allCompleted =
          updatedItem.episodes.length > 0 &&
          updatedItem.episodes.every((ep) => ep.completed);
      }

      if (allCompleted && updatedItem.status === 'ongoing') {
        updatedItem.status = 'completed';
        updatedItem.completed = true;
      }

      // Update timestamp
      updatedItem.updatedAt = new Date().toISOString();

      // Save updated item
      const updateSuccess = await StorageManager.updateItem(updatedItem);

      if (updateSuccess) {
        // Notify real-time sync manager that data has been updated
        try {
          await realtimeSyncManager.notifyDataChange({
            type: 'episode_updated',
            data: updatedItem,
            source: 'scheduled_task',
          });
        } catch (syncError) {
          console.warn(`[TaskExecutor] 发送实时同步通知失败:`, syncError);
        }

        return {
          success: true,
          markedCount: markedCount,
          projectCompleted: allCompleted,
        };
      } else {
        console.error(`[TaskExecutor] 更新项目数据失败: ${updatedItem.title}`);
        return {
          success: false,
          markedCount: 0,
          projectCompleted: false,
        };
      }
    } catch (error) {
      console.error(`[TaskExecutor] 标记集数时出错:`, error);
      return null;
    }
  }

  /**
   * Delete completed task
   */
  private async deleteCompletedTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(
        `[TaskExecutor] 删除已完结项目的定时任务: ${task.name} (ID: ${task.id})`,
      );

      // Delete task from storage
      const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);

      if (deleteSuccess) {
        // Force refresh task list
        await StorageManager.forceRefreshScheduledTasks();
      }
    } catch (error) {
      console.error(`[TaskExecutor] 删除已完成任务时出错:`, error);
    }
  }
}
