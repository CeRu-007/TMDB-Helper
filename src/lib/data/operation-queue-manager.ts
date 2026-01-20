/**
 * 操作队列管理器
 * 处理高频操作的去重、合并和排队，防止并发冲突
 */

'use client';

import { TMDBItem } from './storage';
import { DistributedLock } from '@/lib/utils/distributed-lock';

export interface QueuedOperation {
  id: string;
  itemId: string;
  type: 'update' | 'add' | 'delete';
  data: TMDBItem;
  originalData?: TMDBItem;
  timestamp: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  priority: number; // 0-10, 10为最高优先级
  debounceMs?: number; // 防抖延迟
}

export interface OperationResult {
  success: boolean;
  operationId: string;
  error?: string;
  mergedWith?: string[]; // 合并的操作ID列表
}

export class OperationQueueManager {
  private static instance: OperationQueueManager;
  private itemQueues: Map<string, QueuedOperation[]> = new Map(); // 按itemId分组的队列
  private processingItems: Set<string> = new Set(); // 正在处理的项目ID
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map(); // 防抖定时器
  private operationCallbacks: Map<string, (result: OperationResult) => void> =
    new Map();

  // 配置参数
  private readonly DEFAULT_DEBOUNCE_MS = 300; // 默认防抖延迟
  private readonly MAX_QUEUE_SIZE = 50; // 每个项目的最大队列长度
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 5; // 批量处理大小

  private constructor() {}

  public static getInstance(): OperationQueueManager {
    if (!OperationQueueManager.instance) {
      OperationQueueManager.instance = new OperationQueueManager();
    }
    return OperationQueueManager.instance;
  }

  /**
   * 添加操作到队列
   */
  public async enqueueOperation(
    operation: Omit<
      QueuedOperation,
      'id' | 'timestamp' | 'status' | 'retryCount'
    >,
    callback?: (result: OperationResult) => void,
  ): Promise<string> {
    const operationId = `op_${operation.itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const queuedOperation: QueuedOperation = {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
      status: 'queued',
      retryCount: 0,
      maxRetries: operation.maxRetries || this.DEFAULT_MAX_RETRIES,
      debounceMs: operation.debounceMs || this.DEFAULT_DEBOUNCE_MS,
    };

    // 注册回调
    if (callback) {
      this.operationCallbacks.set(operationId, callback);
    }

    // 检查是否需要合并操作
    const mergedOperations = await this.mergeOperation(queuedOperation);

    if (mergedOperations.length > 0) {
      // 通知被合并的操作
      for (const mergedId of mergedOperations) {
        const callback = this.operationCallbacks.get(mergedId);
        if (callback) {
          callback({
            success: true,
            operationId: mergedId,
            mergedWith: [operationId],
          });
          this.operationCallbacks.delete(mergedId);
        }
      }
    }

    // 添加到队列
    if (!this.itemQueues.has(operation.itemId)) {
      this.itemQueues.set(operation.itemId, []);
    }

    const queue = this.itemQueues.get(operation.itemId)!;

    // 检查队列长度限制
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      const oldestOp = queue.shift();
      if (oldestOp) {
        this.notifyOperationResult(oldestOp.id, false, '队列已满，操作被丢弃');
      }
    }

    queue.push(queuedOperation);

    console.log(
      `[OperationQueue] 操作已入队: ${operationId} (队列长度: ${queue.length})`,
    );

    // 启动防抖处理
    this.startDebounceTimer(operation.itemId);

    return operationId;
  }

  /**
   * 合并操作（去重和优化）
   */
  private async mergeOperation(
    newOperation: QueuedOperation,
  ): Promise<string[]> {
    const queue = this.itemQueues.get(newOperation.itemId) || [];
    const mergedOperations: string[] = [];

    // 查找可以合并的操作
    for (let i = queue.length - 1; i >= 0; i--) {
      const existingOp = queue[i];

      // 只合并相同类型且未开始处理的操作
      if (
        existingOp.type === newOperation.type &&
        existingOp.status === 'queued' &&
        this.canMergeOperations(existingOp, newOperation)
      ) {
        // 合并数据（使用最新的数据）
        newOperation.data = { ...existingOp.data, ...newOperation.data };
        newOperation.priority = Math.max(
          existingOp.priority,
          newOperation.priority,
        );

        // 记录被合并的操作
        mergedOperations.push(existingOp.id);

        // 从队列中移除被合并的操作
        queue.splice(i, 1);
      }
    }

    return mergedOperations;
  }

  /**
   * 判断两个操作是否可以合并
   */
  private canMergeOperations(
    op1: QueuedOperation,
    op2: QueuedOperation,
  ): boolean {
    // 相同项目的相同类型操作可以合并
    if (op1.itemId === op2.itemId && op1.type === op2.type) {
      // 时间间隔在防抖范围内
      const timeDiff = Math.abs(op2.timestamp - op1.timestamp);
      return timeDiff <= (op1.debounceMs || this.DEFAULT_DEBOUNCE_MS);
    }
    return false;
  }

  /**
   * 启动防抖定时器
   */
  private startDebounceTimer(itemId: string): void {
    // 清除现有定时器
    const existingTimer = this.debounceTimers.get(itemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的防抖定时器
    const timer = setTimeout(() => {
      this.processItemQueue(itemId);
      this.debounceTimers.delete(itemId);
    }, this.DEFAULT_DEBOUNCE_MS);

    this.debounceTimers.set(itemId, timer);
  }

  /**
   * 处理特定项目的队列
   */
  private async processItemQueue(itemId: string): Promise<void> {
    if (this.processingItems.has(itemId)) {
      return;
    }

    const queue = this.itemQueues.get(itemId);
    if (!queue || queue.length === 0) {
      return;
    }

    this.processingItems.add(itemId);

    try {
      // 获取分布式锁
      const lockKey = `item_update_${itemId}`;
      const lockResult = await DistributedLock.acquireLock(
        lockKey,
        'storage_write',
        30000,
      );

      if (!lockResult.success) {
        // 延迟重试
        setTimeout(() => this.processItemQueue(itemId), 1000);
        return;
      }

      try {
        // 按优先级和时间排序
        queue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority; // 高优先级在前
          }
          return a.timestamp - b.timestamp; // 早的在前
        });

        // 批量处理操作
        const batch = queue.splice(0, this.BATCH_SIZE);
        await this.processBatch(batch);

        // 如果还有剩余操作，继续处理
        if (queue.length > 0) {
          setTimeout(() => this.processItemQueue(itemId), 100);
        }
      } finally {
        await DistributedLock.releaseLock(lockKey);
      }
    } catch (error) {
      // 标记队列中的操作为失败
      const queue = this.itemQueues.get(itemId) || [];
      for (const op of queue) {
        this.notifyOperationResult(
          op.id,
          false,
          error instanceof Error ? error.message : '处理失败',
        );
      }

      // 清空失败的队列
      this.itemQueues.delete(itemId);
    } finally {
      this.processingItems.delete(itemId);
    }
  }

  /**
   * 批量处理操作
   */
  private async processBatch(operations: QueuedOperation[]): Promise<void> {
    for (const operation of operations) {
      operation.status = 'processing';

      try {
        const success = await this.executeOperation(operation);

        if (success) {
          operation.status = 'completed';
          this.notifyOperationResult(operation.id, true);
        } else {
          throw new Error('操作执行失败');
        }
      } catch (error) {
        operation.status = 'failed';
        operation.retryCount++;

        const errorMessage =
          error instanceof Error ? error.message : '未知错误';

        if (operation.retryCount < operation.maxRetries) {
          console.log(
            `[OperationQueue] 操作失败，准备重试: ${operation.id} (${operation.retryCount}/${operation.maxRetries})`,
          );

          // 重新入队重试
          operation.status = 'queued';
          const queue = this.itemQueues.get(operation.itemId) || [];
          queue.unshift(operation); // 插入到队列前面，优先处理
        } else {
          this.notifyOperationResult(operation.id, false, errorMessage);
        }
      }
    }
  }

  /**
   * 执行单个操作（增强版，支持 AbortError 处理）
   */
  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    console.log(
      `[OperationQueue] 执行操作: ${operation.id} (${operation.type})`,
    );

    try {
      // 这里会被具体的存储管理器实现
      // 实际实现中会调用真实的API

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 模拟成功率
      const success = Math.random() > 0.1; // 90% 成功率

      if (!success) {
        throw new Error('模拟操作失败');
      }

      return true;
    } catch (error) {
      // 特殊处理 AbortError 和超时错误
      if (error instanceof Error) {
        if (
          error.message.includes('请求超时') ||
          error.message.includes('请求被中止')
        ) {
          // 对于网络问题，我们认为这是可重试的错误
          return false;
        } else if (error.message.includes('API调用失败')) {
          return false;
        }
      }

      // 其他错误也返回 false，让重试机制处理
      return false;
    }
  }

  /**
   * 通知操作结果
   */
  private notifyOperationResult(
    operationId: string,
    success: boolean,
    error?: string,
  ): void {
    const callback = this.operationCallbacks.get(operationId);
    if (callback) {
      callback({
        success,
        operationId,
        error,
      });
      this.operationCallbacks.delete(operationId);
    }
  }

  /**
   * 获取队列状态
   */
  public getQueueStatus(): {
    totalQueued: number;
    processingItems: number;
    queuesByItem: Record<string, number>;
  } {
    let totalQueued = 0;
    const queuesByItem: Record<string, number> = {};

    for (const [itemId, queue] of this.itemQueues) {
      const queuedCount = queue.filter((op) => op.status === 'queued').length;
      queuesByItem[itemId] = queuedCount;
      totalQueued += queuedCount;
    }

    return {
      totalQueued,
      processingItems: this.processingItems.size,
      queuesByItem,
    };
  }

  /**
   * 清理空队列和过期操作
   */
  public cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分钟

    for (const [itemId, queue] of this.itemQueues) {
      // 移除过期操作
      const validOps = queue.filter((op) => {
        const isExpired = now - op.timestamp > maxAge;
        if (isExpired) {
          this.notifyOperationResult(op.id, false, '操作已过期');
        }
        return !isExpired;
      });

      if (validOps.length === 0) {
        this.itemQueues.delete(itemId);
      } else {
        this.itemQueues.set(itemId, validOps);
      }
    }
  }

  /**
   * 设置操作执行器
   */
  public setOperationExecutor(
    executor: (operation: QueuedOperation) => Promise<boolean>,
  ): void {
    this.executeOperation = executor;
  }
}

export const operationQueueManager = OperationQueueManager.getInstance();
