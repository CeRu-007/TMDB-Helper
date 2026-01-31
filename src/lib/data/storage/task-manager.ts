import { v4 as uuidv4 } from 'uuid';
import { StorageBase } from './storage-base';
import { ScheduledTask } from './types';
import { logger } from '@/lib/utils/logger';

export class TaskManager extends StorageBase {
  /**
   * 获取所有定时任务（增强版，包含详细错误处理和缓存）
   */
  static async getScheduledTasks(
    forceRefresh: boolean = false,
  ): Promise<ScheduledTask[]> {
    try {
      // 检查缓存是否有效（5分钟缓存）
      const now = Date.now();
      const cacheValid =
        this.scheduledTasksCache &&
        now - this.scheduledTasksCache.timestamp < this.scheduledTasksCache.ttl;

      if (!forceRefresh && cacheValid && this.scheduledTasksCache) {
        return this.scheduledTasksCache.data as ScheduledTask[];
      }

      const response = await fetch('/api/tasks/scheduled-tasks');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取定时任务失败');
      }

      const tasks: ScheduledTask[] = result.tasks || [];

      // 验证数据格式
      if (!Array.isArray(tasks)) {
        throw new Error('定时任务数据格式错误：期望数组格式');
      }

      // 验证和规范化任务数据
      const normalizedTasks: ScheduledTask[] = [];
      const invalidTasks: unknown[] = [];

      for (let i = 0; i < tasks.length; i++) {
        try {
          const task = tasks[i];

          // 基本字段验证
          if (!task || typeof task !== 'object') {
            invalidTasks.push({ index: i, task, reason: '不是有效对象' });
            continue;
          }

          if (!task.id || typeof task.id !== 'string') {
            invalidTasks.push({ index: i, task, reason: '缺少有效的ID' });
            continue;
          }

          // 规范化任务
          const normalizedTask = this.normalizeTask(task);
          normalizedTasks.push(normalizedTask);
        } catch (taskError) {
          invalidTasks.push({
            index: i,
            task: tasks[i],
            reason: taskError instanceof Error ? taskError.message : '未知错误',
          });
        }
      }

      // 报告无效任务
      if (invalidTasks.length > 0) {
        // console.warn(
        //   `发现${invalidTasks.length}个无效任务，已跳过`,
        //   invalidTasks,
        // );
      }

      // 更新缓存
      this.scheduledTasksCache = {
        data: normalizedTasks,
        timestamp: now,
        ttl: 5 * 60 * 1000, // 5分钟缓存
      };

      return normalizedTasks;
    } catch (error) {
      // 提供更详细的错误信息
      if (error instanceof Error) {
        throw new Error(`读取定时任务数据失败: ${error.message}`);
      } else {
        throw new Error('读取定时任务数据失败: 未知错误');
      }
    }
  }

  /**
   * 规范化任务对象，确保所有必要字段都存在
   */
  private static normalizeTask(task: unknown): ScheduledTask {
    const taskObj = task as any;
    const normalized: ScheduledTask = {
      id: taskObj.id || uuidv4(),
      itemId: taskObj.itemId || '',
      itemTitle: taskObj.itemTitle || '',
      itemTmdbId: taskObj.itemTmdbId || undefined,
      name: taskObj.name || '未命名任务',
      type: 'tmdb-import',
      schedule: {
        type: taskObj.schedule?.type || 'weekly',
        dayOfWeek: taskObj.schedule?.dayOfWeek ?? new Date().getDay(),
        secondDayOfWeek: taskObj.schedule?.secondDayOfWeek ?? undefined,
        hour: taskObj.schedule?.hour ?? new Date().getHours(),
        minute: taskObj.schedule?.minute ?? 0,
      },
      action: {
        seasonNumber: taskObj.action?.seasonNumber ?? 1,
        autoUpload: taskObj.action?.autoUpload ?? true,
        conflictAction: taskObj.action?.conflictAction ?? 'w',
        autoRemoveMarked: taskObj.action?.autoRemoveMarked ?? true,
        autoConfirm: taskObj.action?.autoConfirm !== false,
        autoMarkUploaded: taskObj.action?.autoMarkUploaded !== false,
        removeAirDateColumn: taskObj.action?.removeAirDateColumn === true,
        removeRuntimeColumn: taskObj.action?.removeRuntimeColumn === true,
        removeBackdropColumn: taskObj.action?.removeBackdropColumn === true,
      },
      enabled: taskObj.enabled ?? false,
      lastRun: taskObj.lastRun ?? undefined,
      nextRun: taskObj.nextRun ?? undefined,
      lastRunStatus: taskObj.lastRunStatus,
      lastRunError: taskObj.lastRunError,
      createdAt: taskObj.createdAt || new Date().toISOString(),
      updatedAt: taskObj.updatedAt || new Date().toISOString(),
    };
    // 增强的项目ID验证（修复：允许时间戳格式的ID）
    if (!normalized.itemId || normalized.itemId.trim() === '') {
      normalized.lastRunStatus = 'failed';
      normalized.lastRunError = '任务缺少项目ID，无法执行';
      normalized.enabled = false; // 自动禁用无效任务
    } else if (
      normalized.itemId.length > 50 ||
      normalized.itemId.includes(' ') ||
      normalized.itemId.includes('\n') ||
      normalized.itemId.includes('\t')
    ) {
      normalized.lastRunStatus = 'failed';
      normalized.lastRunError = `项目ID "${normalized.itemId}" 格式无效，请重新关联正确的项目`;
      normalized.enabled = false; // 自动禁用无效任务
    }
    // 记录详细日志
    return normalized;
  }

  /**
   * 强制刷新定时任务缓存
   */
  static async forceRefreshScheduledTasks(): Promise<ScheduledTask[]> {
    return this.getScheduledTasks(true);
  }

  /**
   * 清除定时任务缓存
   */
  static clearScheduledTasksCache(): void {
    this.scheduledTasksCache = null;
  }

  /**
   * 添加定时任务，自动关联项目属性
   */
  static async addScheduledTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 验证任务的必要字段
      if (!task.id) {
        return false;
      }

      // 规范化任务对象
      const normalizedTask = this.normalizeTask(task);
      // 仅在任务未提供完整项目信息时才从项目列表查找
      if (!normalizedTask.itemTitle || !normalizedTask.itemTmdbId) {
        // 确保项目相关属性正确
        const items = await this.getItemsWithRetry();
        const relatedItem = items.find(
          (item) => item.id === normalizedTask.itemId,
        );

        if (relatedItem) {
          // 只有在任务未提供这些信息时才更新
          if (!normalizedTask.itemTitle)
            normalizedTask.itemTitle = relatedItem.title;
          if (!normalizedTask.itemTmdbId)
            normalizedTask.itemTmdbId = (relatedItem as any).tmdbId;
          // console.log(
          //   `[TaskManager] 补充项目信息: ${relatedItem.title} (ID: ${relatedItem.id})`,
          // );
        } else {
          // console.warn(
          //   `[TaskManager] 任务关联的项目不存在: ${normalizedTask.itemId}`,
          // );
        }
      } else {
        // console.log(
        //   `[TaskManager] 任务已包含完整项目信息: ${normalizedTask.itemTitle} (ID: ${normalizedTask.itemId})`,
        // );
      }
      // 调用服务端API添加任务
      const response = await fetch('/api/tasks/scheduled-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedTask),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '添加定时任务失败');
      }

      // 清除缓存，确保下次获取时重新读取
      this.clearScheduledTasksCache();

      return true;
    } catch (_error) {
      // console.error('[TaskManager] 添加定时任务失败:', error);
      return false;
    }
  }

  /**
   * 更新定时任务，自动更新项目关联属性
   */
  static async updateScheduledTask(
    updatedTask: ScheduledTask,
  ): Promise<boolean> {
    try {
      // 验证任务的必要字段
      if (!updatedTask.id) {
        return false;
      }

      // 规范化任务对象
      const normalizedTask = this.normalizeTask(updatedTask);
      // 仅在任务未提供完整项目信息时才从项目列表查找
      if (!normalizedTask.itemTitle || !normalizedTask.itemTmdbId) {
        // 确保项目相关属性正确
        const items = await this.getItemsWithRetry();
        const relatedItem = items.find(
          (item) => item.id === normalizedTask.itemId,
        );

        if (relatedItem) {
          // 只有在任务未提供这些信息时才更新
          if (!normalizedTask.itemTitle)
            normalizedTask.itemTitle = relatedItem.title;
          if (!normalizedTask.itemTmdbId)
            normalizedTask.itemTmdbId = (relatedItem as any).tmdbId;
          logger.info(
            `[TaskManager] 补充项目信息: ${relatedItem.title} (ID: ${relatedItem.id})`,
          );
        } else {
          logger.warn(
            `[TaskManager] 任务关联的项目不存在: ${normalizedTask.itemId}`,
          );
        }
      } else {
        logger.info(
          `[TaskManager] 任务已包含完整项目信息: ${normalizedTask.itemTitle} (ID: ${normalizedTask.itemId})`,
        );
      }
      // 更新updatedAt字段
      normalizedTask.updatedAt = new Date().toISOString();

      // 调用服务端API更新任务
      const response = await fetch('/api/tasks/scheduled-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalizedTask),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '更新定时任务失败');
      }

      // 清除缓存，确保下次获取时重新读取
      this.clearScheduledTasksCache();

      return true;
    } catch (_error) {
      // console.error('[TaskManager] 更新定时任务失败:', error);
      return false;
    }
  }

  /**
   * 删除定时任务
   */
  static async deleteScheduledTask(id: string): Promise<boolean> {
    try {
      // 调用服务端API删除任务
      const response = await fetch(
        `/api/tasks/scheduled-tasks?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除定时任务失败');
      }

      // 清除缓存，确保下次获取时重新读取
      this.clearScheduledTasksCache();

      return true;
    } catch (_error) {
      // console.error('[TaskManager] 删除定时任务失败:', error);
      return false;
    }
  }

  /**
   * 获取指定项目的所有定时任务
   */
  static async getItemScheduledTasks(itemId: string): Promise<ScheduledTask[]> {
    const allTasks = await this.getScheduledTasks();
    return allTasks.filter((task) => task.itemId === itemId);
  }

  /**
   * 获取与指定项目ID关联的所有定时任务
   */
  static async getRelatedScheduledTasks(
    itemId: string,
  ): Promise<ScheduledTask[]> {
    try {
      const tasks = await this.getScheduledTasks();
      return tasks.filter((task) => task.itemId === itemId);
    } catch (error) {
      return [];
    }
  }
}
