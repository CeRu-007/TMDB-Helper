/**
 * TaskQueue
 * 负责任务队列和冲突检测
 */

import { ScheduledTask } from '../storage';
import { ConflictDetector } from '../conflict-detector';
import { ConflictResolver } from '../conflict-resolver';
import { advancedConfigManager } from '../task-scheduler-config';
import { TaskExecutor } from './task-executor';
import { logger } from '@/lib/utils/logger';

/**
 * 任务队列管理器
 * 处理任务队列和冲突检测
 */
export class TaskQueue {
  private conflictDetector: ConflictDetector;
  private conflictResolver: ConflictResolver;

  constructor(private taskExecutor: TaskExecutor) {
    // 初始化冲突检测和解决器
    const advancedConfig = advancedConfigManager.getConfig();

    // 转换配置格式以匹配ConflictDetectionConfig接口
    const conflictDetectionConfig = {
      enabled: advancedConfig.conflictDetection.enabled,
      detectionWindowMs: advancedConfig.conflictDetection.conflictWindowMs,
      strictMode: advancedConfig.conflictDetection.strictMode,
      considerPriority: advancedConfig.conflictDetection.considerPriority,
      considerTaskType: advancedConfig.conflictDetection.considerTaskType,
    };

    this.conflictDetector = new ConflictDetector(conflictDetectionConfig);
    this.conflictResolver = new ConflictResolver(
      advancedConfig.conflictResolution,
    );
  }

  /**
   * 将任务加入队列（冲突解决策略）
   */
  public async enqueueTask(
    task: ScheduledTask,
    resolution: { queuePosition?: number; strategy?: string },
  ): Promise<void> {
    try {
      // 这里需要集成任务队列系统
      // 由于现有的taskQueue可能不完全兼容，我们先用简单的延迟执行
      const delayMs = (resolution.queuePosition || 1) * 60000; // 每个队列位置延迟1分钟

      setTimeout(async () => {
        await this.taskExecutor.executeTaskWithRetry(task);
      }, delayMs);
    } catch (error) {
      logger.error('TaskQueue', '任务入队失败', error);
      // 如果队列失败，回退到普通调度
      // 注意：这里需要通过回调或事件通知主调度器重新调度
    }
  }

  /**
   * 检测任务冲突
   */
  public detectConflicts(task: ScheduledTask, nextRunTime: Date): unknown[] {
    return this.conflictDetector.detectConflicts(task, nextRunTime);
  }

  /**
   * 解决任务冲突
   */
  public resolveConflicts(
    task: ScheduledTask,
    nextRunTime: Date,
    conflicts: unknown[],
  ): unknown {
    return this.conflictResolver.resolveConflicts(
      task,
      nextRunTime,
      conflicts,
    );
  }

  /**
   * 注册任务到冲突检测器
   */
  public registerTask(task: ScheduledTask, nextRunTime: Date): void {
    this.conflictDetector.registerScheduledTask(task, nextRunTime);
  }

  /**
   * 注销任务从冲突检测器
   */
  public unregisterTask(taskId: string): void {
    this.conflictDetector.unregisterTask(taskId);
  }

  /**
   * 获取冲突检测统计信息
   */
  public getConflictStats() {
    return {
      detector: this.conflictDetector.getConflictStats(),
      resolver: this.conflictResolver.getResolutionStats(),
    };
  }

  /**
   * 更新冲突检测和解决配置
   */
  public updateConflictConfig(config: Partial<TaskSchedulerAdvancedConfig>): void {
    const advancedConfig = advancedConfigManager.getConfig();

    if (config.conflictDetection) {
      // 转换配置格式以匹配ConflictDetectionConfig接口
      const conflictDetectionConfig = {
        enabled:
          config.conflictDetection.enabled ??
          advancedConfig.conflictDetection.enabled,
        detectionWindowMs:
          config.conflictDetection.conflictWindowMs ??
          config.conflictDetection.detectionWindowMs ??
          advancedConfig.conflictDetection.conflictWindowMs,
        strictMode:
          config.conflictDetection.strictMode ??
          advancedConfig.conflictDetection.strictMode,
        considerPriority:
          config.conflictDetection.considerPriority ??
          advancedConfig.conflictDetection.considerPriority,
        considerTaskType:
          config.conflictDetection.considerTaskType ??
          advancedConfig.conflictDetection.considerTaskType,
      };

      this.conflictDetector.updateConfig(conflictDetectionConfig);

      // 更新advancedConfigManager时使用原始格式
      const advancedConfigUpdate = {
        enabled: conflictDetectionConfig.enabled,
        conflictWindowMs: conflictDetectionConfig.detectionWindowMs,
        strictMode: conflictDetectionConfig.strictMode,
        considerPriority: conflictDetectionConfig.considerPriority,
        considerTaskType: conflictDetectionConfig.considerTaskType,
        maxAdjustments:
          config.conflictDetection.maxAdjustments ??
          advancedConfig.conflictDetection.maxAdjustments,
        adjustmentIntervalMs:
          config.conflictDetection.adjustmentIntervalMs ??
          advancedConfig.conflictDetection.adjustmentIntervalMs,
      };

      advancedConfigManager.updateConfig({
        conflictDetection: advancedConfigUpdate,
      });
    }

    if (config.conflictResolution) {
      this.conflictResolver.updateConfig(config.conflictResolution);
      advancedConfigManager.updateConfig({
        conflictResolution: config.conflictResolution,
      });
    }
  }

  /**
   * 清理过期的冲突检测数据
   */
  public cleanupConflictData(): void {
    this.conflictDetector.cleanupExpiredTasks();
    this.conflictResolver.clearResolutionHistory();
  }
}