/**
 * 任务队列系统
 * 支持任务优先级、批量处理和队列管理
 */

import { ScheduledTask } from './storage';
import { DistributedLock } from './distributed-lock';
import { performanceMonitor } from './performance-monitor';
import { configManager } from './config-manager';

export interface QueuedTask {
  id: string;
  task: ScheduledTask;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  queuedAt: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  metadata?: Record<string, any>;
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

export class TaskQueue {
  private static instance: TaskQueue;
  private queue: Map<string, QueuedTask> = new Map();
  private processingTasks: Set<string> = new Set();
  private isProcessing = false;
  private readonly QUEUE_KEY = 'tmdb_helper_task_queue';

  private constructor() {
    this.loadQueue();
  }

  public static getInstance(): TaskQueue {
    if (!TaskQueue.instance) {
      TaskQueue.instance = new TaskQueue();
    }
    return TaskQueue.instance;
  }

  /**
   * 启动队列处理（只在启动时执行一次）
   */
  public startProcessing(): void {
    if (this.isProcessing) {
      console.log('[TaskQueue] 队列处理已在运行中');
      return;
    }

    console.log('[TaskQueue] 启动任务队列处理（一次性执行）');
    this.isProcessing = true;

    // 只在启动时处理一次，移除定时器
    this.processQueue();
  }

  /**
   * 停止队列处理（已移除定时器）
   */
  public stopProcessing(): void {
    if (!this.isProcessing) {
      return;
    }

    console.log('[TaskQueue] 停止任务队列处理');
    this.isProcessing = false;
  }

  /**
   * 添加任务到队列
   */
  public async enqueue(
    task: ScheduledTask,
    priority: QueuedTask['priority'] = 'normal',
    maxAttempts: number = 3,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const queuedTask: QueuedTask = {
      id: `queue_${task.id}_${Date.now()}`,
      task,
      priority,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts,
      status: 'queued',
      metadata,
    };

    this.queue.set(queuedTask.id, queuedTask);
    await this.saveQueue();

    console.log(
      `[TaskQueue] 任务已加入队列: ${task.name} (优先级: ${priority})`,
    );

    // 记录性能指标
    performanceMonitor.recordMetric({
      id: `queue_enqueue_${queuedTask.id}`,
      name: 'task_enqueued',
      type: 'counter',
      value: 1,
      tags: { taskId: task.id, priority },
    });

    return queuedTask.id;
  }

  /**
   * 从队列中移除任务
   */
  public async dequeue(queueId: string): Promise<boolean> {
    const queuedTask = this.queue.get(queueId);
    if (!queuedTask) {
      return false;
    }

    this.queue.delete(queueId);
    this.processingTasks.delete(queueId);
    await this.saveQueue();

    console.log(`[TaskQueue] 任务已从队列移除: ${queuedTask.task.name}`);
    return true;
  }

  /**
   * 取消队列中的任务
   */
  public async cancelTask(queueId: string): Promise<boolean> {
    const queuedTask = this.queue.get(queueId);
    if (!queuedTask) {
      return false;
    }

    if (queuedTask.status === 'processing') {
      // 如果任务正在处理中，标记为取消
      queuedTask.status = 'cancelled';
    } else {
      // 直接从队列中移除
      this.queue.delete(queueId);
    }

    await this.saveQueue();
    console.log(`[TaskQueue] 任务已取消: ${queuedTask.task.name}`);
    return true;
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    try {
      const config = configManager.getConfig();
      const maxConcurrent = config.maxConcurrentTasks;

      // 检查当前处理中的任务数量
      if (this.processingTasks.size >= maxConcurrent) {
        return;
      }

      // 获取待处理的任务（按优先级排序）
      const queuedTasks = Array.from(this.queue.values())
        .filter(
          (t) =>
            t.status === 'queued' ||
            (t.status === 'failed' && this.shouldRetry(t)),
        )
        .sort(this.comparePriority);

      const availableSlots = maxConcurrent - this.processingTasks.size;
      const tasksToProcess = queuedTasks.slice(0, availableSlots);

      for (const queuedTask of tasksToProcess) {
        await this.processTask(queuedTask);
      }
    } catch (error) {
      console.error('[TaskQueue] 处理队列时出错:', error);
    }
  }

  /**
   * 处理单个任务
   */
  private async processTask(queuedTask: QueuedTask): Promise<void> {
    const lockKey = `queue_task_${queuedTask.task.id}`;
    const lockResult = await DistributedLock.acquireLock(
      lockKey,
      'task_execution',
      15 * 60 * 1000,
    );

    if (!lockResult.success) {
      console.log(`[TaskQueue] 无法获取任务锁: ${queuedTask.task.name}`);
      return;
    }

    try {
      // 更新任务状态
      queuedTask.status = 'processing';
      queuedTask.attempts++;
      this.processingTasks.add(queuedTask.id);
      await this.saveQueue();

      console.log(
        `[TaskQueue] 开始处理任务: ${queuedTask.task.name} (尝试 ${queuedTask.attempts}/${queuedTask.maxAttempts})`,
      );

      // 开始性能监控
      performanceMonitor.startTaskExecution(
        queuedTask.id,
        queuedTask.task.name,
      );

      // 执行任务
      const startTime = Date.now();
      await this.executeTask(queuedTask);
      const duration = Date.now() - startTime;

      // 任务成功完成
      queuedTask.status = 'completed';
      queuedTask.error = undefined;

      console.log(
        `[TaskQueue] 任务处理完成: ${queuedTask.task.name} (耗时: ${duration}ms)`,
      );

      // 结束性能监控
      performanceMonitor.endTaskExecution(queuedTask.id, 'success');

      // 记录性能指标
      performanceMonitor.recordMetric({
        id: `queue_completed_${queuedTask.id}`,
        name: 'task_completed',
        type: 'timer',
        value: duration,
        tags: { taskId: queuedTask.task.id, priority: queuedTask.priority },
      });
    } catch (error) {
      console.error(`[TaskQueue] 任务处理失败: ${queuedTask.task.name}`, error);

      queuedTask.error = error instanceof Error ? error.message : String(error);

      // 检查是否需要重试
      if (queuedTask.attempts < queuedTask.maxAttempts) {
        queuedTask.status = 'failed';
        queuedTask.nextRetryAt = this.calculateNextRetry(
          queuedTask.attempts,
        ).toISOString();
        console.log(
          `[TaskQueue] 任务将重试: ${queuedTask.task.name} (${queuedTask.attempts}/${queuedTask.maxAttempts})`,
        );
      } else {
        queuedTask.status = 'failed';
        console.log(`[TaskQueue] 任务最终失败: ${queuedTask.task.name}`);
      }

      // 结束性能监控
      performanceMonitor.endTaskExecution(
        queuedTask.id,
        'failed',
        queuedTask.error,
      );
    } finally {
      this.processingTasks.delete(queuedTask.id);
      await this.saveQueue();
      await DistributedLock.releaseLock(lockKey);
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(queuedTask: QueuedTask): Promise<void> {
    const task = queuedTask.task;

    // 调用API执行任务
    const response = await fetch('/api/tasks/execute-scheduled-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: task.id,
        itemId: task.itemId,
        action: task.action,
        metadata: {
          tmdbId: task.itemTmdbId,
          title: task.itemTitle,
          queueId: queuedTask.id,
          priority: queuedTask.priority,
          attempt: queuedTask.attempts,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || result.message || '任务执行失败');
    }

    // 更新任务元数据
    if (queuedTask.metadata) {
      queuedTask.metadata.result = result;
      queuedTask.metadata.completedAt = new Date().toISOString();
    }
  }

  /**
   * 计算下次重试时间
   */
  private calculateNextRetry(attempts: number): Date {
    const config = configManager.getConfig();
    const baseDelay = config.retryDelay;
    const multiplier = config.backoffMultiplier;

    // 指数退避算法
    const delay = baseDelay * Math.pow(multiplier, attempts - 1);
    return new Date(Date.now() + delay);
  }

  /**
   * 检查是否应该重试
   */
  private shouldRetry(queuedTask: QueuedTask): boolean {
    if (queuedTask.attempts >= queuedTask.maxAttempts) {
      return false;
    }

    if (!queuedTask.nextRetryAt) {
      return true;
    }

    return new Date() >= new Date(queuedTask.nextRetryAt);
  }

  /**
   * 比较任务优先级
   */
  private comparePriority(a: QueuedTask, b: QueuedTask): number {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // 高优先级在前
    }

    // 相同优先级按入队时间排序
    return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
  }

  /**
   * 获取队列统计信息
   */
  public getQueueStats(): QueueStats {
    const tasks = Array.from(this.queue.values());
    const now = Date.now();

    const stats: QueueStats = {
      total: tasks.length,
      queued: tasks.filter((t) => t.status === 'queued').length,
      processing: tasks.filter((t) => t.status === 'processing').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      averageWaitTime: 0,
      averageProcessingTime: 0,
    };

    // 计算平均等待时间
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' || t.status === 'failed',
    );
    if (completedTasks.length > 0) {
      const totalWaitTime = completedTasks.reduce((sum, task) => {
        const queuedAt = new Date(task.queuedAt).getTime();
        // 假设处理开始时间是最后一次尝试的时间
        const processingStarted = queuedAt + (task.attempts - 1) * 60000; // 简化计算
        return sum + (processingStarted - queuedAt);
      }, 0);
      stats.averageWaitTime = totalWaitTime / completedTasks.length;
    }

    return stats;
  }

  /**
   * 获取队列中的任务列表
   */
  public getQueuedTasks(status?: QueuedTask['status']): QueuedTask[] {
    const tasks = Array.from(this.queue.values());

    if (status) {
      return tasks.filter((t) => t.status === status);
    }

    return tasks.sort(this.comparePriority);
  }

  /**
   * 清理已完成的任务
   */
  public async cleanupCompletedTasks(
    olderThanHours: number = 24,
  ): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, task] of this.queue.entries()) {
      if (
        (task.status === 'completed' ||
          task.status === 'failed' ||
          task.status === 'cancelled') &&
        new Date(task.queuedAt) < cutoffTime
      ) {
        this.queue.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.saveQueue();
      console.log(`[TaskQueue] 清理了 ${cleanedCount} 个已完成的任务`);
    }

    return cleanedCount;
  }

  /**
   * 批量添加任务
   */
  public async enqueueBatch(
    tasks: Array<{
      task: ScheduledTask;
      priority?: QueuedTask['priority'];
      maxAttempts?: number;
      metadata?: Record<string, any>;
    }>,
  ): Promise<string[]> {
    const queueIds: string[] = [];

    for (const taskInfo of tasks) {
      const queueId = await this.enqueue(
        taskInfo.task,
        taskInfo.priority || 'normal',
        taskInfo.maxAttempts || 3,
        taskInfo.metadata,
      );
      queueIds.push(queueId);
    }

    console.log(`[TaskQueue] 批量添加了 ${tasks.length} 个任务到队列`);
    return queueIds;
  }

  /**
   * 暂停队列处理
   */
  public pauseProcessing(): void {
    this.isProcessing = false;
    console.log('[TaskQueue] 队列处理已暂停');
  }

  /**
   * 恢复队列处理
   */
  public resumeProcessing(): void {
    if (!this.isProcessing) {
      this.isProcessing = true;
      console.log('[TaskQueue] 队列处理已恢复');
    }
  }

  /**
   * 保存队列到存储
   */
  private async saveQueue(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const queueData = {
          tasks: Array.from(this.queue.entries()),
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queueData));
      }
    } catch (error) {
      console.error('[TaskQueue] 保存队列失败:', error);
    }
  }

  /**
   * 从存储加载队列
   */
  private loadQueue(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const queueData = localStorage.getItem(this.QUEUE_KEY);
        if (queueData) {
          const parsed = JSON.parse(queueData);
          if (parsed.tasks && Array.isArray(parsed.tasks)) {
            this.queue = new Map(parsed.tasks);
            console.log(
              `[TaskQueue] 从存储加载了 ${this.queue.size} 个队列任务`,
            );
          }
        }
      }
    } catch (error) {
      console.error('[TaskQueue] 加载队列失败:', error);
      this.queue = new Map();
    }
  }

  /**
   * 获取任务详情
   */
  public getTask(queueId: string): QueuedTask | null {
    return this.queue.get(queueId) || null;
  }

  /**
   * 更新任务优先级
   */
  public async updateTaskPriority(
    queueId: string,
    priority: QueuedTask['priority'],
  ): Promise<boolean> {
    const task = this.queue.get(queueId);
    if (!task || task.status === 'processing') {
      return false;
    }

    task.priority = priority;
    await this.saveQueue();

    console.log(`[TaskQueue] 更新任务优先级: ${task.task.name} -> ${priority}`);
    return true;
  }

  /**
   * 重置失败的任务
   */
  public async resetFailedTask(queueId: string): Promise<boolean> {
    const task = this.queue.get(queueId);
    if (!task || task.status !== 'failed') {
      return false;
    }

    task.status = 'queued';
    task.attempts = 0;
    task.error = undefined;
    task.nextRetryAt = undefined;
    await this.saveQueue();

    console.log(`[TaskQueue] 重置失败任务: ${task.task.name}`);
    return true;
  }
}

// 导出单例实例
export const taskQueue = TaskQueue.getInstance();
