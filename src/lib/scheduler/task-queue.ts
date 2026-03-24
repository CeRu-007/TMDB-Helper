/**
 * 定时任务串行队列
 */

import { logger } from '@/lib/utils/logger';

export interface TaskItem {
  id: string;
  execute: () => Promise<void>;
}

class TaskQueue {
  private queue: TaskItem[] = [];
  private isProcessing = false;

  async enqueue(task: TaskItem): Promise<void> {
    this.queue.push(task);
    logger.debug(`[TaskQueue] 任务入队: ${task.id}, 队列长度: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.debug('[TaskQueue] 开始处理队列');

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        logger.debug(`[TaskQueue] 执行任务: ${task.id}`);
        await task.execute();
        logger.debug(`[TaskQueue] 任务完成: ${task.id}`);
      } catch (error) {
        logger.error(`[TaskQueue] 任务执行失败: ${task.id}`, error);
      }
    }

    this.isProcessing = false;
    logger.debug('[TaskQueue] 队列处理完成');
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    logger.debug('[TaskQueue] 队列已清空');
  }
}

export const taskQueue = new TaskQueue();
