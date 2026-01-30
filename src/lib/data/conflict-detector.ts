/**
 * 任务冲突检测器
 * 负责检测定时任务的时间冲突和资源冲突
 */

import { ScheduledTask } from '@/lib/data/storage';
import { logger } from '@/lib/utils/logger';

export interface ConflictInfo {
  taskId: string;
  taskName: string;
  scheduledTime: Date;
  conflictType: 'time' | 'resource' | 'priority';
  severity: 'low' | 'medium' | 'high';
  conflictingTasks: string[];
  metadata?: Record<string, any>;
}

export interface ConflictDetectionConfig {
  enabled: boolean;
  detectionWindowMs: number; // 冲突检测时间窗口（毫秒）
  strictMode: boolean; // 严格模式：更小的时间窗口
  considerPriority: boolean; // 是否考虑任务优先级
  considerTaskType: boolean; // 是否考虑任务类型
}

export class ConflictDetector {
  private config: ConflictDetectionConfig;
  private scheduledTasks: Map<
    string,
    { task: ScheduledTask; scheduledTime: Date }
  > = new Map();

  constructor(config: ConflictDetectionConfig) {
    this.config = config;
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ConflictDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 注册已调度的任务
   */
  public registerScheduledTask(task: ScheduledTask, scheduledTime: Date): void {
    this.scheduledTasks.set(task.id, { task, scheduledTime });
    logger.info(
      `[ConflictDetector] 注册任务: ${task.name} 计划执行时间: ${scheduledTime.toLocaleString('zh-CN')}`,
    );
  }

  /**
   * 取消注册任务
   */
  public unregisterTask(taskId: string): void {
    if (this.scheduledTasks.delete(taskId)) {
    }
  }

  /**
   * 检测指定任务的冲突
   */
  public detectConflicts(
    task: ScheduledTask,
    targetTime: Date,
  ): ConflictInfo[] {
    if (!this.config.enabled) {
      return [];
    }

    const conflicts: ConflictInfo[] = [];
    const windowMs = this.config.strictMode
      ? Math.min(this.config.detectionWindowMs, 30000) // 严格模式最多30秒
      : this.config.detectionWindowMs;

    logger.info(
      `[ConflictDetector] 检测任务冲突: ${task.name}, 目标时间: ${targetTime.toLocaleString('zh-CN')}, 检测窗口: ${windowMs}ms`,
    );

    // 检测时间冲突
    const timeConflicts = this.detectTimeConflicts(task, targetTime, windowMs);
    conflicts.push(...timeConflicts);

    // 检测资源冲突
    if (this.config.considerTaskType) {
      const resourceConflicts = this.detectResourceConflicts(
        task,
        targetTime,
        windowMs,
      );
      conflicts.push(...resourceConflicts);
    }

    // 检测优先级冲突
    if (this.config.considerPriority) {
      const priorityConflicts = this.detectPriorityConflicts(
        task,
        targetTime,
        windowMs,
      );
      conflicts.push(...priorityConflicts);
    }

    if (conflicts.length > 0) {
      logger.info(
        `[ConflictDetector] 检测到 ${conflicts.length} 个冲突:`,
        conflicts.map((c) => ({
          task: c.taskName,
          type: c.conflictType,
          severity: c.severity,
        })),
      );
    }

    return conflicts;
  }

  /**
   * 检测时间冲突
   */
  private detectTimeConflicts(
    task: ScheduledTask,
    targetTime: Date,
    windowMs: number,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const targetTimeMs = targetTime.getTime();

    for (const [taskId, { task: existingTask, scheduledTime }] of this
      .scheduledTasks) {
      if (taskId === task.id) continue; // 跳过自己

      const timeDiff = Math.abs(scheduledTime.getTime() - targetTimeMs);

      if (timeDiff <= windowMs) {
        const severity = this.calculateTimeSeverity(timeDiff, windowMs);

        conflicts.push({
          taskId: task.id,
          taskName: task.name,
          scheduledTime: targetTime,
          conflictType: 'time',
          severity,
          conflictingTasks: [taskId],
          metadata: {
            conflictingTaskName: existingTask.name,
            timeDifferenceMs: timeDiff,
            existingScheduledTime: scheduledTime.toISOString(),
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测资源冲突（相同类型的任务）
   */
  private detectResourceConflicts(
    task: ScheduledTask,
    targetTime: Date,
    windowMs: number,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const targetTimeMs = targetTime.getTime();

    for (const [taskId, { task: existingTask, scheduledTime }] of this
      .scheduledTasks) {
      if (taskId === task.id) continue;

      // 检查是否是相同类型的任务
      if (task.type === existingTask.type) {
        const timeDiff = Math.abs(scheduledTime.getTime() - targetTimeMs);

        if (timeDiff <= windowMs * 2) {
          // 资源冲突使用更大的时间窗口
          conflicts.push({
            taskId: task.id,
            taskName: task.name,
            scheduledTime: targetTime,
            conflictType: 'resource',
            severity: 'medium',
            conflictingTasks: [taskId],
            metadata: {
              conflictingTaskName: existingTask.name,
              taskType: task.type,
              timeDifferenceMs: timeDiff,
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 检测优先级冲突
   */
  private detectPriorityConflicts(
    task: ScheduledTask,
    targetTime: Date,
    windowMs: number,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    const taskPriority = this.getTaskPriority(task);
    const targetTimeMs = targetTime.getTime();

    for (const [taskId, { task: existingTask, scheduledTime }] of this
      .scheduledTasks) {
      if (taskId === task.id) continue;

      const existingPriority = this.getTaskPriority(existingTask);
      const timeDiff = Math.abs(scheduledTime.getTime() - targetTimeMs);

      // 如果高优先级任务与低优先级任务时间接近
      if (timeDiff <= windowMs && taskPriority > existingPriority) {
        conflicts.push({
          taskId: task.id,
          taskName: task.name,
          scheduledTime: targetTime,
          conflictType: 'priority',
          severity: 'low',
          conflictingTasks: [taskId],
          metadata: {
            conflictingTaskName: existingTask.name,
            taskPriority,
            existingPriority,
            timeDifferenceMs: timeDiff,
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * 计算时间冲突严重程度
   */
  private calculateTimeSeverity(
    timeDiff: number,
    windowMs: number,
  ): 'low' | 'medium' | 'high' {
    const ratio = timeDiff / windowMs;

    if (ratio <= 0.1) return 'high'; // 10%以内：高严重程度
    if (ratio <= 0.5) return 'medium'; // 50%以内：中等严重程度
    return 'low'; // 其他：低严重程度
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

    return priorityMap[priority] || 2; // 默认为normal
  }

  /**
   * 获取所有已注册的任务
   */
  public getScheduledTasks(): Array<{
    task: ScheduledTask;
    scheduledTime: Date;
  }> {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * 清理过期的任务注册
   */
  public cleanupExpiredTasks(): void {
    const now = new Date();
    const expiredTasks: string[] = [];

    for (const [taskId, { scheduledTime }] of this.scheduledTasks) {
      // 如果任务计划时间已过去超过1小时，认为是过期的
      if (now.getTime() - scheduledTime.getTime() > 60 * 60 * 1000) {
        expiredTasks.push(taskId);
      }
    }

    expiredTasks.forEach((taskId) => {
      this.scheduledTasks.delete(taskId);
    });

    if (expiredTasks.length > 0) {
    }
  }

  /**
   * 获取冲突统计信息
   */
  public getConflictStats(): {
    totalTasks: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
  } {
    const stats = {
      totalTasks: this.scheduledTasks.size,
      conflictsByType: { time: 0, resource: 0, priority: 0 },
      conflictsBySeverity: { low: 0, medium: 0, high: 0 },
    };

    // 这里可以添加更详细的统计逻辑
    return stats;
  }
}
