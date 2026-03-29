/**
 * 定时任务调度器
 */

import cron, { ScheduledTask } from 'node-cron';
import { scheduleRepository } from '@/lib/data/schedule-repository';
import { scheduleLogRepository } from '@/lib/data/schedule-log-repository';
import { taskQueue } from './task-queue';
import { logger } from '@/lib/utils/logger';
import type { ScheduleTask } from '@/types/schedule';
import { executeScheduleTask, processScheduleTaskResult, type LogEntry } from './schedule-executor';
import { itemsRepository } from '@/lib/database/repositories/items.repository';
import { notifier } from './notifier';

class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) {
      logger.warn('[Scheduler] 调度器已初始化');
      return;
    }

    logger.info('[Scheduler] 初始化定时任务调度器...');
    this.loadTasks();
    this.isInitialized = true;
  }

  private loadTasks(): void {
    const enabledTasks = scheduleRepository.findAllEnabled();
    logger.info(`[Scheduler] 加载 ${enabledTasks.length} 个启用的定时任务`);

    for (const task of enabledTasks) {
      this.scheduleTask(task);
    }
  }

  scheduleTask(task: ScheduleTask): void {
    if (this.tasks.has(task.id)) {
      logger.debug(`[Scheduler] 任务已存在，先取消: ${task.id}`);
      this.unscheduleTask(task.id);
    }

    if (!task.enabled) {
      logger.debug(`[Scheduler] 任务未启用，跳过调度: ${task.id}`);
      return;
    }

    if (!cron.validate(task.cron)) {
      logger.error(`[Scheduler] 无效的 cron 表达式: ${task.cron}`);
      return;
    }

    const scheduledTask = cron.schedule(
      task.cron,
      () => {
        this.executeTask(task);
      },
      {
        timezone: 'Asia/Shanghai',
      }
    );

    scheduledTask.start();
    this.tasks.set(task.id, scheduledTask);
    logger.debug(`[Scheduler] 任务已调度: ${task.id}, cron: ${task.cron}`);
  }

  unscheduleTask(taskId: string): void {
    const scheduledTask = this.tasks.get(taskId);
    if (scheduledTask) {
      scheduledTask.stop();
      this.tasks.delete(taskId);
      logger.debug(`[Scheduler] 任务已取消: ${taskId}`);
    }
  }

  async updateTask(task: ScheduleTask): Promise<void> {
    this.unscheduleTask(task.id);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  async executeTask(task: ScheduleTask): Promise<void> {
    logger.info(`[Scheduler] 触发定时任务: ${task.id}`);

    taskQueue.enqueue({
      id: task.id,
      execute: async () => {
        await this.runTask(task);
      },
    });
  }

  private async runTask(task: ScheduleTask): Promise<void> {
    const startAt = new Date().toISOString();

    const logResult = scheduleLogRepository.create({
      taskId: task.id,
      status: 'running',
      startAt,
      endAt: null,
      message: '任务开始执行',
      details: null,
    });

    if (!logResult.success || !logResult.data) {
      logger.error('[Scheduler] 创建执行日志失败');
      return;
    }

    const logId = logResult.data.id;
    const logs: LogEntry[] = [];

    try {
      logger.info(`[Scheduler] 开始执行任务: ${task.id}`);

      const item = itemsRepository.findByIdWithRelations(task.itemId);
      if (!item) {
        scheduleLogRepository.updateStatus(logId, 'failed', '词条不存在');
        logger.error(`[Scheduler] 词条不存在: ${task.itemId}`);
        return;
      }

      const executeResult = await executeScheduleTask(item, task, logs);

      const endAt = new Date().toISOString();

      if (executeResult.success) {
        const processResult = await processScheduleTaskResult(item, task, executeResult, true);

        if (processResult.completed) {
          this.removeTask(task.id);
          scheduleLogRepository.updateStatus(logId, 'success', processResult.message);
        } else {
          scheduleLogRepository.updateStatus(logId, 'success', executeResult.message, executeResult.details || null);
          scheduleRepository.updateLastRunAt(
            task.id,
            endAt,
            this.calculateNextRunTime(task.cron)
          );
          notifier.sendSuccessNotification(item.title, executeResult.episodeCount || 0);
        }

        logger.info(`[Scheduler] 任务执行成功: ${task.id}`);
      } else {
        scheduleLogRepository.updateStatus(logId, 'failed', executeResult.message);
        notifier.sendErrorNotification(item.title, executeResult.message);
        logger.error(`[Scheduler] 任务执行失败: ${task.id}, ${executeResult.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      scheduleLogRepository.updateStatus(logId, 'failed', message);
      logger.error(`[Scheduler] 任务执行异常: ${task.id}`, error);
    }
  }

  private calculateNextRunTime(cronExpression: string): string {
    try {
      const cronParts = cronExpression.split(' ');
      if (cronParts.length < 5) {
        return '';
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [, minute, hour, , dayOfWeek] = cronParts;

      if (dayOfWeek === '*') {
        if (hour === '*') {
          return '';
        }

        const targetHour = parseInt(hour, 10);
        const targetMinute = parseInt(minute, 10);

        const next = new Date(now);
        if (targetHour > currentHour || (targetHour === currentHour && targetMinute > currentMinute)) {
          next.setHours(targetHour, targetMinute, 0, 0);
        } else {
          next.setDate(next.getDate() + 1);
          next.setHours(targetHour, targetMinute, 0, 0);
        }

        return next.toISOString();
      }

      return '';
    } catch {
      return '';
    }
  }

  updateTask(task: ScheduleTask): void {
    this.unscheduleTask(task.id);
    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  removeTask(taskId: string): void {
    this.unscheduleTask(taskId);
  }

  getScheduledTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  shutdown(): void {
    logger.info('[Scheduler] 关闭调度器...');
    for (const [taskId, task] of this.tasks) {
      task.stop();
      logger.debug(`[Scheduler] 任务已停止: ${taskId}`);
    }
    this.tasks.clear();
    this.isInitialized = false;
    logger.info('[Scheduler] 调度器已关闭');
  }
}

export const scheduler = new Scheduler();
