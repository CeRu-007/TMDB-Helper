/**
 * TaskExecutor - 任务执行协调器
 * 负责任务执行的协调、重试逻辑和错误处理
 */

import { ScheduledTask, TMDBItem } from '../storage';
import { StorageManager } from '../storage';
import { taskExecutionLogger } from '../task-execution-logger';
import { DistributedLock } from '@/lib/utils/distributed-lock';
import { TMDBImportWorkflow } from './tmdb-import-workflow';

/**
 * 任务执行器
 * 协调任务执行的完整流程，包括重试逻辑和错误处理
 */
export class TaskExecutor {
  private currentExecution: Set<string> = new Set();
  private tmdbImportWorkflow: TMDBImportWorkflow;

  constructor() {
    this.tmdbImportWorkflow = new TMDBImportWorkflow();
  }

  /**
   * 执行任务（带重试机制）
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

    // 检查任务是否已在执行中
    if (this.currentExecution.has(task.id)) {
      console.warn(
        `[TaskExecutor] 任务 ${task.id} (${task.name}) 已在执行中，跳过本次执行`,
      );
      return;
    }

    // 检查任务是否已禁用
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

      // 如果还有重试次数，延迟重试
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 60000; // 指数退避: 1min, 2min, 4min
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
   * 内部任务执行实现
   */
  private async _executeTaskInternal(task: ScheduledTask): Promise<void> {
    // 获取分布式锁
    const lockKey = `task_${task.id}`;
    const lockResult = await DistributedLock.acquireLock(
      lockKey,
      'task_execution',
      10 * 60 * 1000, // 10分钟超时
    );

    if (!lockResult.success) {
      console.warn(
        `[TaskExecutor] 任务 ${task.id} (${task.name}) 获取锁失败，可能已在其他进程中执行`,
      );
      return;
    }

    // 标记任务为执行中
    this.currentExecution.add(task.id);

    try {
      // 启动执行日志
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

      // 更新任务的最后执行时间
      const updatedTask = { ...task, lastRun: new Date().toISOString() };
      await StorageManager.updateScheduledTask(updatedTask);

      try {
        await taskExecutionLogger.updateProgress(task.id, 5);
      } catch (logError) {
        console.warn(`[TaskExecutor] 更新进度失败:`, logError);
      }

      // 执行任务
      if (task.type === 'tmdb-import') {
        await this.executeTMDBImportTask(task);
      } else {
        console.warn(`[TaskExecutor] 未知任务类型: ${task.type}`);
      }
    } catch (error) {
      console.error(`[TaskExecutor] 执行任务时发生错误: ${task.name}`, error);
      throw error;
    } finally {
      // 释放分布式锁
      await DistributedLock.releaseLock(lockKey);

      // 清理执行状态
      this.currentExecution.delete(task.id);
    }
  }

  /**
   * 执行TMDB导入任务
   */
  private async executeTMDBImportTask(task: ScheduledTask): Promise<void> {
    // 获取关联的项目
    const relatedItem = await this.getRelatedItem(task);

    if (!relatedItem) {
      console.error(`[TaskExecutor] 无法找到任务关联的项目: ${task.id}`);
      throw new Error(`找不到任务关联的项目 (itemId: ${task.itemId})`);
    }

    // 验证基本条件
    if (!relatedItem.platformUrl) {
      throw new Error(
        `项目 ${relatedItem.title} 缺少平台URL，无法执行TMDB导入`,
      );
    }

    if (task.action.seasonNumber > 0 && relatedItem.mediaType === 'tv') {
      if (
        !relatedItem.seasons ||
        !relatedItem.seasons.some((s) => s.seasonNumber === task.action.seasonNumber)
      ) {
        throw new Error(
          `项目 ${relatedItem.title} 没有第 ${task.action.seasonNumber} 季，请检查季数设置`,
        );
      }
    }

    // 验证工作流前置条件
    const validationResult = this.tmdbImportWorkflow.validateWorkflowPreconditions(
      task,
      relatedItem,
    );

    if (!validationResult.valid) {
      throw new Error(validationResult.error || '工作流前置条件验证失败');
    }

    // 执行导入工作流
    const result = await this.tmdbImportWorkflow.executeWorkflow(task, relatedItem);

    if (!result.success) {
      throw new Error(result.error || 'TMDB导入工作流执行失败');
    }

    // 检查是否需要删除已完结的任务
    if (task.action.autoDeleteWhenCompleted) {
      const season = relatedItem.seasons?.find(
        (s) => s.seasonNumber === task.action.seasonNumber,
      );

      if (season && season.markedEpisodes && season.numberOfEpisodes) {
        const isCompleted = season.markedEpisodes.length === season.numberOfEpisodes;
        if (isCompleted) {
          console.log(
            `[TaskExecutor] 项目已完结，自动删除任务: ${task.name}`,
          );
          await this.deleteCompletedTask(task);
        }
      }
    }
  }

  /**
   * 获取关联的项目
   */
  private async getRelatedItem(task: ScheduledTask): Promise<TMDBItem | null> {
    try {
      const items = await StorageManager.getItemsWithRetry();

      // 策略1: 通过ID匹配
      let item = items.find((i) => i.id === task.itemId);
      if (item) {
        console.log(
          `[TaskExecutor] 通过ID找到项目: ${item.title} (ID: ${item.id})`,
        );
        return item;
      }

      // 策略2: 通过TMDB ID匹配
      if (task.itemTmdbId) {
        item = items.find((i) => i.tmdbId === task.itemTmdbId);
        if (item) {
          console.log(
            `[TaskExecutor] 通过TMDB ID找到项目: ${item.title} (ID: ${item.id})`,
          );
          return item;
        }
      }

      // 策略3: 通过标题匹配
      if (task.itemTitle) {
        item = items.find((i) => i.title === task.itemTitle);
        if (item) {
          console.log(
            `[TaskExecutor] 通过标题找到项目: ${item.title} (ID: ${item.id})`,
          );
          return item;
        }
      }

      console.error(
        `[TaskExecutor] 无法找到关联的项目: itemId=${task.itemId}, itemTitle=${task.itemTitle}, itemTmdbId=${task.itemTmdbId}`,
      );
      return null;
    } catch (error) {
      console.error(`[TaskExecutor] 获取关联项目时出错:`, error);
      return null;
    }
  }

  /**
   * 删除已完结的任务
   */
  private async deleteCompletedTask(task: ScheduledTask): Promise<void> {
    try {
      const success = await StorageManager.deleteScheduledTask(task.id);
      if (success) {
        console.log(
          `[TaskExecutor] 成功删除已完结的任务: ${task.name}`,
        );
      } else {
        console.error(
          `[TaskExecutor] 删除已完结的任务失败: ${task.name}`,
        );
      }
    } catch (error) {
      console.error(
        `[TaskExecutor] 删除已完结的任务时出错: ${task.name}`,
        error,
      );
    }
  }

  /**
   * 手动执行任务
   */
  public async executeTaskManually(task: ScheduledTask): Promise<void> {
    console.log(`[TaskExecutor] 手动执行任务: ${task.name}`);
    await this.executeTaskWithRetry(task);
  }

  /**
   * 检查任务是否正在执行
   */
  public isTaskRunning(taskId: string): boolean {
    return this.currentExecution.has(taskId);
  }

  /**
   * 获取最后一次执行错误
   */
  public getLastError(): Error | null {
    return null; // 可以扩展为存储最后一次错误
  }
}