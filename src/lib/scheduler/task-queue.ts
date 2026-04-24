import { logger } from '@/lib/utils/logger';

export interface TaskItem {
  id: string;
  execute: () => Promise<void>;
}

class TaskQueue {
  private queue: TaskItem[] = [];
  private isProcessing = false;

  async enqueue(task: TaskItem): Promise<void> {
    const existingInQueue = this.queue.find(t => t.id === task.id);
    if (existingInQueue) {
      logger.debug(`[TaskQueue] 任务已在队列中，跳过重复入队: ${task.id}`);
      return;
    }

    this.queue.push(task);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        await task.execute();
      } catch (error) {
        logger.error(`[TaskQueue] 任务执行失败: ${task.id}`, error);
      }
    }

    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

export const taskQueue = new TaskQueue();
