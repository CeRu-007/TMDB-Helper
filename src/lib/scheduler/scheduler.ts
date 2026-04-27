import cron, { ScheduledTask } from 'node-cron';
import { scheduleRepository } from '@/lib/data/schedule-repository';
import { scheduleLogRepository } from '@/lib/data/schedule-log-repository';
import { taskQueue } from './task-queue';
import { logger } from '@/lib/utils/logger';
import type { ScheduleTask } from '@/types/schedule';
import { executeScheduleTask, processScheduleTaskResult, type LogEntry } from './schedule-executor';
import { itemsRepository } from '@/lib/database/repositories/items.repository';
import { notifier } from './notifier';

const TASK_TIMEOUT_MS = 10 * 60 * 1000;

class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private executingTaskIds: Set<string> = new Set();
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) {
      logger.warn('[Scheduler] 调度器已初始化');
      return;
    }

    logger.info('[Scheduler] 初始化定时任务调度器...');
    const enabledTasks = scheduleRepository.findAllEnabled();
    logger.info(`[Scheduler] 加载 ${enabledTasks.length} 个启用的定时任务`);

    for (const task of enabledTasks) {
      const item = itemsRepository.findByIdWithRelations(task.itemId);
      if (item?.status === 'completed') {
        logger.info(`[Scheduler] 词条已完结，清理定时任务: ${item.title} (${task.id})`);
        scheduleRepository.deleteByItemId(task.itemId);
        continue;
      }
      this.scheduleTask(task);
    }

    this.isInitialized = true;
    logger.info('[Scheduler] 调度器初始化完成');
  }

  scheduleTask(task: ScheduleTask): void {
    if (this.tasks.has(task.id)) {
      this.unscheduleTask(task.id);
    }

    if (!task.enabled) {
      return;
    }

    if (!cron.validate(task.cron)) {
      logger.error(`[Scheduler] 无效的 cron 表达式: ${task.cron}`);
      return;
    }

    const taskId = task.id;
    const scheduledTask = cron.schedule(
      task.cron,
      () => {
        const freshTask = scheduleRepository.findById(taskId);
        if (freshTask) {
          this.executeTask(freshTask);
        } else {
          logger.warn(`[Scheduler] 任务已被删除: ${taskId}`);
          this.unscheduleTask(taskId);
        }
      },
      {
        timezone: 'Asia/Shanghai',
      }
    );

    this.tasks.set(task.id, scheduledTask);
    logger.debug(`[Scheduler] 任务已调度: ${task.id}, cron: ${task.cron}`);
  }

  unscheduleTask(taskId: string): void {
    const scheduledTask = this.tasks.get(taskId);
    if (scheduledTask) {
      scheduledTask.stop();
      this.tasks.delete(taskId);
    }
  }

  updateTask(task: ScheduleTask): void {
    this.unscheduleTask(task.id);
    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  async executeTask(task: ScheduleTask): Promise<void> {
    if (this.executingTaskIds.has(task.id)) {
      logger.warn(`[Scheduler] 任务正在执行中，跳过本次触发: ${task.id}`);
      return;
    }

    logger.info(`[Scheduler] 触发定时任务: ${task.id}`);
    this.executingTaskIds.add(task.id);

    taskQueue.enqueue({
      id: task.id,
      execute: async () => {
        await this.runTaskWithTimeout(task);
      },
    });
  }

  private async runTaskWithTimeout(task: ScheduleTask): Promise<void> {
    try {
      await Promise.race([
        this.runTask(task),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`任务执行超时 (${TASK_TIMEOUT_MS / 1000}秒)`)), TASK_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      logger.error(`[Scheduler] 任务执行失败: ${task.id}, ${message}`);

      const latestLog = scheduleLogRepository.findLatestByTaskId(task.id);
      if (latestLog && latestLog.status === 'running') {
        scheduleLogRepository.updateStatus(latestLog.id, 'failed', message);
      }
    } finally {
      this.executingTaskIds.delete(task.id);
    }
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
        this.removeTask(task.id);
        scheduleRepository.deleteByItemId(task.itemId);
        return;
      }

      if (item.status === 'completed') {
        scheduleLogRepository.updateStatus(logId, 'failed', '词条已完结，任务已自动删除');
        logger.info(`[Scheduler] 词条已完结，删除定时任务: ${task.id}`);
        this.removeTask(task.id);
        scheduleRepository.deleteByItemId(task.itemId);
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
      const minute = cronParts[0];
      const hour = cronParts[1];
      const dayOfWeek = cronParts[4];

      if (dayOfWeek !== '*') {
        return this.calculateNextRunTimeForDayOfWeek(now, minute, hour, dayOfWeek);
      }

      if (hour === '*' || isNaN(parseInt(hour, 10))) {
        return '';
      }

      const targetHour = parseInt(hour, 10);
      const targetMinute = parseInt(minute, 10);

      if (isNaN(targetMinute)) {
        return '';
      }

      const next = new Date(now);
      if (targetHour > now.getHours() || (targetHour === now.getHours() && targetMinute > now.getMinutes())) {
        next.setHours(targetHour, targetMinute, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(targetHour, targetMinute, 0, 0);
      }

      return next.toISOString();
    } catch {
      return '';
    }
  }

  private calculateNextRunTimeForDayOfWeek(now: Date, minute: string, hour: string, dayOfWeek: string): string {
    const targetHour = parseInt(hour, 10);
    const targetMinute = parseInt(minute, 10);

    if (isNaN(targetHour) || isNaN(targetMinute)) {
      return '';
    }

    const targetDays = dayOfWeek.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d));
    if (targetDays.length === 0) {
      return '';
    }

    const currentDay = now.getDay();
    const sortedDays = targetDays.sort((a, b) => a - b);

    let minDiff = Infinity;
    for (const targetDay of sortedDays) {
      let diff = targetDay - currentDay;
      if (diff < 0) diff += 7;
      if (diff === 0) {
        if (targetHour > now.getHours() || (targetHour === now.getHours() && targetMinute > now.getMinutes())) {
          minDiff = 0;
          break;
        } else {
          diff = 7;
        }
      }
      if (diff < minDiff) minDiff = diff;
    }

    const next = new Date(now);
    next.setDate(next.getDate() + minDiff);
    next.setHours(targetHour, targetMinute, 0, 0);
    return next.toISOString();
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
    this.executingTaskIds.clear();
    this.isInitialized = false;
    logger.info('[Scheduler] 调度器已关闭');
  }
}

export const scheduler = new Scheduler();
