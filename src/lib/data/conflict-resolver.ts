/**
 * 任务冲突解决器
 * 负责解决定时任务的冲突，提供多种解决策略
 */

import { ScheduledTask } from '@/types/scheduled-task';
import { ConflictInfo } from './conflict-detector';

export interface Resolution {
  taskId: string;
  taskName: string;
  originalTime: Date;
  newTime?: Date;
  strategy: 'stagger' | 'queue' | 'priority' | 'skip';
  reason: string;
  adjustmentMs?: number;
  queuePosition?: number;
  metadata?: Record<string, any>;
}

export interface ConflictResolutionConfig {
  enabled: boolean;
  defaultStrategy: 'stagger' | 'queue' | 'priority' | 'hybrid';
  staggerIntervalMs: number; // 错开时间间隔
  maxStaggerAttempts: number; // 最大错开尝试次数
  queueEnabled: boolean; // 是否启用队列策略
  priorityWeights: Record<string, number>; // 优先级权重
  adaptiveAdjustment: boolean; // 自适应调整
}

export class ConflictResolver {
  private config: ConflictResolutionConfig;
  private resolutionHistory: Resolution[] = [];

  constructor(config: ConflictResolutionConfig) {
    this.config = config;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ConflictResolutionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 解决冲突
   */
  public resolveConflicts(
    task: ScheduledTask,
    targetTime: Date,
    conflicts: ConflictInfo[],
  ): Resolution | null {
    if (!this.config.enabled || conflicts.length === 0) {
      return null;
    }

    let resolution: Resolution | null = null;

    // 根据配置的策略解决冲突
    switch (this.config.defaultStrategy) {
      case 'stagger':
        resolution = this.resolveByStaggering(task, targetTime, conflicts);
        break;
      case 'queue':
        resolution = this.resolveByQueuing(task, targetTime, conflicts);
        break;
      case 'priority':
        resolution = this.resolveByPriority(task, targetTime, conflicts);
        break;
      case 'hybrid':
        resolution = this.resolveByHybridStrategy(task, targetTime, conflicts);
        break;
    }

    if (resolution) {
      this.resolutionHistory.push(resolution);
      console.log(`[ConflictResolver] 冲突解决完成:`, {
        task: resolution.taskName,
        strategy: resolution.strategy,
        originalTime: resolution.originalTime.toLocaleString('zh-CN'),
        newTime: resolution.newTime?.toLocaleString('zh-CN'),
        reason: resolution.reason,
      });
    }

    return resolution;
  }

  /**
   * 时间错开策略
   */
  private resolveByStaggering(
    task: ScheduledTask,
    targetTime: Date,
    conflicts: ConflictInfo[],
  ): Resolution | null {
    const maxAttempts = this.config.maxStaggerAttempts;
    const intervalMs = this.config.staggerIntervalMs;

    // 尝试向后调整时间
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const adjustmentMs = intervalMs * attempt;
      const newTime = new Date(targetTime.getTime() + adjustmentMs);

      // 检查新时间是否仍有冲突（这里简化处理，实际应该重新检测）
      if (this.isTimeSlotAvailable(newTime, conflicts)) {
        return {
          taskId: task.id,
          taskName: task.name,
          originalTime: targetTime,
          newTime,
          strategy: 'stagger',
          reason: `时间错开策略：向后调整 ${adjustmentMs / 1000} 秒避免冲突`,
          adjustmentMs,
          metadata: {
            attempt,
            intervalMs,
            conflictCount: conflicts.length,
          },
        };
      }
    }

    // 如果向后调整失败，尝试向前调整
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const adjustmentMs = intervalMs * attempt;
      const newTime = new Date(targetTime.getTime() - adjustmentMs);

      // 确保不会调整到过去的时间
      if (
        newTime.getTime() > Date.now() &&
        this.isTimeSlotAvailable(newTime, conflicts)
      ) {
        return {
          taskId: task.id,
          taskName: task.name,
          originalTime: targetTime,
          newTime,
          strategy: 'stagger',
          reason: `时间错开策略：向前调整 ${adjustmentMs / 1000} 秒避免冲突`,
          adjustmentMs: -adjustmentMs,
          metadata: {
            attempt,
            intervalMs,
            conflictCount: conflicts.length,
            direction: 'backward',
          },
        };
      }
    }

    return null; // 无法通过时间错开解决
  }

  /**
   * 队列策略
   */
  private resolveByQueuing(
    task: ScheduledTask,
    targetTime: Date,
    conflicts: ConflictInfo[],
  ): Resolution | null {
    if (!this.config.queueEnabled) {
      return null;
    }

    // 计算队列位置（基于优先级和冲突数量）
    const taskPriority = this.getTaskPriority(task);
    const queuePosition = this.calculateQueuePosition(taskPriority, conflicts);

    return {
      taskId: task.id,
      taskName: task.name,
      originalTime: targetTime,
      strategy: 'queue',
      reason: `队列策略：任务将在队列中等待执行，位置: ${queuePosition}`,
      queuePosition,
      metadata: {
        priority: taskPriority,
        conflictCount: conflicts.length,
        estimatedDelayMs: queuePosition * 60000, // 假设每个位置延迟1分钟
      },
    };
  }

  /**
   * 优先级策略
   */
  private resolveByPriority(
    task: ScheduledTask,
    targetTime: Date,
    conflicts: ConflictInfo[],
  ): Resolution | null {
    const taskPriority = this.getTaskPriority(task);

    // 检查是否有低优先级的冲突任务
    const lowerPriorityConflicts = conflicts.filter(
      (conflict) =>
        // 这里需要获取冲突任务的优先级，简化处理
        conflict.severity === 'low' || conflict.conflictType === 'priority',
    );

    if (lowerPriorityConflicts.length > 0) {
      // 高优先级任务保持原时间，低优先级任务需要调整
      return {
        taskId: task.id,
        taskName: task.name,
        originalTime: targetTime,
        newTime: targetTime, // 保持原时间
        strategy: 'priority',
        reason: `优先级策略：高优先级任务保持原定时间，${lowerPriorityConflicts.length} 个低优先级任务将被调整`,
        metadata: {
          taskPriority,
          displacedTasks: lowerPriorityConflicts.length,
          conflictTypes: lowerPriorityConflicts.map((c) => c.conflictType),
        },
      };
    }

    // 如果当前任务优先级不够高，尝试其他策略
    return this.resolveByStaggering(task, targetTime, conflicts);
  }

  /**
   * 混合策略
   */
  private resolveByHybridStrategy(
    task: ScheduledTask,
    targetTime: Date,
    conflicts: ConflictInfo[],
  ): Resolution | null {
    const taskPriority = this.getTaskPriority(task);
    const highSeverityConflicts = conflicts.filter(
      (c) => c.severity === 'high',
    );

    // 根据任务优先级和冲突严重程度选择策略
    if (taskPriority >= 3 && highSeverityConflicts.length === 0) {
      // 高优先级任务且无高严重程度冲突：使用优先级策略
      return this.resolveByPriority(task, targetTime, conflicts);
    } else if (conflicts.length <= 2) {
      // 冲突较少：使用时间错开策略
      return this.resolveByStaggering(task, targetTime, conflicts);
    } else {
      // 冲突较多：使用队列策略
      return this.resolveByQueuing(task, targetTime, conflicts);
    }
  }

  /**
   * 检查时间段是否可用（简化实现）
   */
  private isTimeSlotAvailable(time: Date, conflicts: ConflictInfo[]): boolean {
    // 这里应该重新进行冲突检测，简化处理
    const timeMs = time.getTime();
    const windowMs = 30000; // 30秒窗口

    return !conflicts.some((conflict) => {
      const conflictTimeMs = conflict.scheduledTime.getTime();
      return Math.abs(timeMs - conflictTimeMs) < windowMs;
    });
  }

  /**
   * 获取任务优先级
   */
  private getTaskPriority(task: ScheduledTask): number {
    const priority = task.metadata?.priority as string;
    const priorityMap: Record<string, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    return priorityMap[priority] || 2;
  }

  /**
   * 计算队列位置
   */
  private calculateQueuePosition(
    taskPriority: number,
    conflicts: ConflictInfo[],
  ): number {
    // 基于优先级和冲突数量计算队列位置
    const basePriority = 5 - taskPriority; // 转换为队列优先级（数字越小优先级越高）
    const conflictPenalty = Math.floor(conflicts.length / 2);

    return Math.max(1, basePriority + conflictPenalty);
  }

  /**
   * 获取解决历史
   */
  public getResolutionHistory(): Resolution[] {
    return [...this.resolutionHistory];
  }

  /**
   * 清理解决历史
   */
  public clearResolutionHistory(): void {
    this.resolutionHistory = [];
  }

  /**
   * 获取解决统计
   */
  public getResolutionStats(): {
    totalResolutions: number;
    strategyCounts: Record<string, number>;
    averageAdjustmentMs: number;
    successRate: number;
  } {
    const total = this.resolutionHistory.length;
    const strategyCounts: Record<string, number> = {};
    let totalAdjustment = 0;
    let adjustmentCount = 0;

    this.resolutionHistory.forEach((resolution) => {
      strategyCounts[resolution.strategy] =
        (strategyCounts[resolution.strategy] || 0) + 1;

      if (resolution.adjustmentMs) {
        totalAdjustment += Math.abs(resolution.adjustmentMs);
        adjustmentCount++;
      }
    });

    return {
      totalResolutions: total,
      strategyCounts,
      averageAdjustmentMs:
        adjustmentCount > 0 ? totalAdjustment / adjustmentCount : 0,
      successRate:
        total > 0
          ? this.resolutionHistory.filter((r) => r.newTime || r.queuePosition)
              .length / total
          : 0,
    };
  }
}
