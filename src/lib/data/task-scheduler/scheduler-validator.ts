/**
 * SchedulerValidator
 * 负责处理初始化、验证和定期检查
 */

import { ScheduledTask } from '../storage';
import { StorageManager } from '../storage';
import { TaskManager } from './task-manager';
import { TimerManager } from './timer-manager';
import { ProjectManager } from './project-manager';
import { TaskExecutor } from './task-executor';
import { DistributedLock } from '@/lib/utils/distributed-lock';
import { configManager } from '@/shared/lib/utils/config-manager';
import { performanceMonitor } from '@/shared/lib/utils/performance-monitor';
// import { StorageSyncManager } from '../storage-sync-manager'; // 该模块不存在，已注释

/**
 * 调度器验证器
 * 处理初始化、验证和定期检查逻辑
 */
export class SchedulerValidator {
  private isInitialized: boolean = false;
  private validationTimer: NodeJS.Timeout | null = null;
  private missedTasksTimer: NodeJS.Timeout | null = null;
  private completedProjectsCleanupTimer: NodeJS.Timeout | null = null;
  private periodicTimerValidationTimer: NodeJS.Timeout | null = null;

  constructor(
    private taskManager: TaskManager,
    private timerManager: TimerManager,
    private projectManager: ProjectManager,
    private taskExecutor: TaskExecutor,
  ) {}

  /**
   * 初始化调度器，加载所有定时任务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 初始化分布式锁系统
      DistributedLock.initialize();

      // 初始化存储同步管理器
      // await StorageSyncManager.initialize(); // 该模块不存在，已注释

      // 启动性能监控
      const config = configManager.getConfig();
      if (config.enablePerformanceMonitoring) {
        performanceMonitor.startMonitoring(300000); // 5分钟间隔
      }

      // 清除所有现有的定时器
      this.timerManager.clearAllTimers();

      // 验证和修复任务关联
      const validationResult =
        await StorageManager.validateAndFixTaskAssociations();

      if (validationResult.invalidTasks > 0) {
        // 记录详细信息
        validationResult.details.forEach((detail) => {
          console.log(`[SchedulerValidator] 任务关联修复: ${detail}`);
        });
      }

      // 加载所有定时任务（已经过验证和修复）
      const tasks = await StorageManager.getScheduledTasks();

      // 检查是否有错过的任务需要立即执行
      await this.checkMissedTasks(tasks);

      // 为每个启用的任务设置定时器
      const enabledTasks = tasks.filter((task) => task.enabled);
      enabledTasks.forEach((task) => {
        this.timerManager.scheduleTask(task);
      });

      // 只在启动时执行一次验证和清理，避免频繁的定时检查

      // 执行一次任务关联验证
      try {
        const result = await StorageManager.validateAndFixTaskAssociations();
        if (result.invalidTasks > 0) {
          console.log(
            `[SchedulerValidator] 启动时修复了 ${result.invalidTasks} 个无效任务`,
          );
        }
      } catch (error) {
        console.error(
          '[SchedulerValidator] 启动时验证任务关联失败:',
          error,
        );
      }

      // 执行一次已完结项目清理
      try {
        await this.projectManager.cleanupCompletedProjectTasks();
      } catch (error) {
        console.error(
          '[SchedulerValidator] 启动时清理已完结项目失败:',
          error,
        );
      }

      this.isInitialized = true;
      console.log(
        `[SchedulerValidator] 初始化完成，已加载 ${tasks.length} 个定时任务 (${enabledTasks.length} 个已启用)`,
      );
    } catch (error) {
      console.error(
        '[SchedulerValidator] 初始化失败:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * 启动定期验证任务关联
   */
  public startPeriodicValidation(): void {
    // 清除现有的验证定时器
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }

    // 设置每小时验证一次任务关联
    this.validationTimer = setInterval(
      async () => {
        try {
          const result = await StorageManager.validateAndFixTaskAssociations();

          if (result.invalidTasks > 0) {
            // 如果有任务被修复或删除，重新初始化调度器
            if (result.fixedTasks > 0 || result.deletedTasks > 0) {
              this.isInitialized = false;
              await this.initialize();
            }
          }
        } catch (error) {
          console.error(
            '[SchedulerValidator] 定期验证任务关联失败:',
            error,
          );
        }
      },
      60 * 60 * 1000,
    ); // 每小时执行一次

    console.log('[SchedulerValidator] 已启动定期任务关联验证 (每小时一次)');
  }

  /**
   * 停止定期验证
   */
  public stopPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
  }

  /**
   * 启动定期检查错过的任务
   */
  public startMissedTasksCheck(): void {
    // 清除现有的错过任务检查定时器
    if (this.missedTasksTimer) {
      clearInterval(this.missedTasksTimer);
    }

    // 每10分钟检查一次错过的任务
    this.missedTasksTimer = setInterval(
      async () => {
        try {
          const tasks = await StorageManager.getScheduledTasks();
          await this.checkMissedTasks(tasks);
        } catch (error) {
          console.error('[SchedulerValidator] 定期检查错过任务失败:', error);
        }
      },
      10 * 60 * 1000,
    ); // 每10分钟执行一次

    console.log('[SchedulerValidator] 已启动定期错过任务检查 (每10分钟一次)');
  }

  /**
   * 停止定期检查错过的任务
   */
  public stopMissedTasksCheck(): void {
    if (this.missedTasksTimer) {
      clearInterval(this.missedTasksTimer);
      this.missedTasksTimer = null;
    }
  }

  /**
   * 启动定期清理已完结项目的任务
   */
  public startCompletedProjectsCleanup(): void {
    // 清除现有的清理定时器
    if (this.completedProjectsCleanupTimer) {
      clearInterval(this.completedProjectsCleanupTimer);
    }

    // 每小时检查一次已完结项目的任务清理
    this.completedProjectsCleanupTimer = setInterval(
      async () => {
        try {
          await this.projectManager.cleanupCompletedProjectTasks();
        } catch (error) {
          console.error(
            '[SchedulerValidator] 定期清理已完结项目任务失败:',
            error,
          );
        }
      },
      60 * 60 * 1000,
    ); // 每小时执行一次

    console.log(
      '[SchedulerValidator] 已启动定期已完结项目任务清理 (每小时一次)',
    );
  }

  /**
   * 停止定期清理已完结项目的任务
   */
  public stopCompletedProjectsCleanup(): void {
    if (this.completedProjectsCleanupTimer) {
      clearInterval(this.completedProjectsCleanupTimer);
      this.completedProjectsCleanupTimer = null;
    }
  }

  /**
   * 启动定期验证所有定时器
   */
  public startPeriodicTimerValidation(): void {
    // 清除现有的验证定时器
    if (this.periodicTimerValidationTimer) {
      clearInterval(this.periodicTimerValidationTimer);
    }

    // 每30分钟验证一次所有定时器
    this.periodicTimerValidationTimer = setInterval(
      async () => {
        try {
          await this.timerManager.validateAllTimers();
        } catch (error) {
          console.error('[SchedulerValidator] 定期验证定时器失败:', error);
        }
      },
      30 * 60 * 1000,
    ); // 每30分钟执行一次

    console.log('[SchedulerValidator] 已启动定期定时器验证 (每30分钟一次)');
  }

  /**
   * 停止定期验证所有定时器
   */
  public stopPeriodicTimerValidation(): void {
    if (this.periodicTimerValidationTimer) {
      clearInterval(this.periodicTimerValidationTimer);
      this.periodicTimerValidationTimer = null;
    }
  }

  /**
   * 检查错过的任务
   */
  private async checkMissedTasks(tasks: ScheduledTask[]): Promise<void> {
    const now = new Date();
    const enabledTasks = tasks.filter((task) => task.enabled);

    for (const task of enabledTasks) {
      try {
        // 如果任务没有设置下次执行时间，跳过
        if (!task.nextRun) {
          continue;
        }

        const nextRunTime = new Date(task.nextRun);
        const timeDiff = now.getTime() - nextRunTime.getTime();

        // 如果当前时间超过了预定执行时间超过5分钟，认为是错过的任务
        if (timeDiff > 5 * 60 * 1000) {
          console.log(
            `[SchedulerValidator] 发现错过的任务: ${task.name} (${task.id}), 预定时间: ${nextRunTime.toLocaleString('zh-CN')}, 当前时间: ${now.toLocaleString('zh-CN')}`,
          );

          // 检查任务是否正在执行中
          if (this.taskExecutor.isTaskRunning(task.id)) {
            continue;
          }

          // 检查是否在合理的补偿时间窗口内（24小时内）
          if (timeDiff <= 24 * 60 * 60 * 1000) {
            console.log(
              `[SchedulerValidator] 执行错过的任务: ${task.name} (${task.id})`,
            );

            // 立即执行错过的任务
            await this.taskExecutor.executeTaskWithRetry(task);
          } else {
            console.log(
              `[SchedulerValidator] 任务 ${task.name} (${task.id}) 错过时间过长 (${Math.round(timeDiff / (60 * 60 * 1000))} 小时)，跳过执行并重新调度`,
            );

            // 重新调度任务到下一个执行时间
            this.timerManager.scheduleTask(task);
          }
        }
      } catch (error) {
        console.error(
          `[SchedulerValidator] 检查错过任务 ${task.id} 时出错:`,
          error,
        );
      }
    }
  }

  /**
   * 验证和修复所有任务的关联
   */
  public async validateAndFixAllTaskAssociations(): Promise<{
    success: boolean;
    message: string;
    details: {
      totalTasks: number;
      invalidTasks: number;
      fixedTasks: number;
      deletedTasks: number;
      details: string[];
    };
  }> {
    try {
      const result = await StorageManager.validateAndFixTaskAssociations();

      // 如果有任务被修复或删除，重新初始化调度器
      if (result.fixedTasks > 0 || result.deletedTasks > 0) {
        this.isInitialized = false;
        await this.initialize();
      }

      const message =
        result.invalidTasks === 0
          ? `所有 ${result.totalTasks} 个任务的关联都是有效的`
          : `处理了 ${result.invalidTasks} 个无效任务: ${result.fixedTasks} 个已修复, ${result.deletedTasks} 个已删除`;

      return {
        success: true,
        message,
        details: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          totalTasks: 0,
          invalidTasks: 0,
          fixedTasks: 0,
          deletedTasks: 0,
          details: [],
        },
      };
    }
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 清理所有定期任务
   */
  public cleanupPeriodicTasks(): void {
    this.stopPeriodicValidation();
    this.stopMissedTasksCheck();
    this.stopCompletedProjectsCleanup();
    this.stopPeriodicTimerValidation();
  }
}