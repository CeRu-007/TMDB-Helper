import { StorageManager, ScheduledTask, TMDBItem } from './storage';
import { taskExecutionLogger } from './task-execution-logger'
import { BrowserInterruptDetector, BrowserInterruptResult } from './browser-interrupt-detector';
import { DistributedLock } from './distributed-lock';
import { StorageSyncManager } from './storage-sync-manager';
import { realtimeSyncManager } from './realtime-sync-manager';
import { ConflictDetector } from './conflict-detector';
import { ConflictResolver } from './conflict-resolver';
import { advancedConfigManager } from './task-scheduler-config';

class TaskScheduler {
  private static instance: TaskScheduler;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;
  private lastError: Error | null = null;
  private currentExecution: Set<string> = new Set(); // 跟踪当前正在执行的任务
  private validationTimer: NodeJS.Timeout | null = null; // 定期验证定时器
  private timerValidations: Map<string, NodeJS.Timeout> = new Map(); // 单个定时器验证

  // 冲突检测和解决相关
  private conflictDetector: ConflictDetector;
  private conflictResolver: ConflictResolver;

  private constructor() {
    // 初始化冲突检测和解决器
    const advancedConfig = advancedConfigManager.getConfig();
    this.conflictDetector = new ConflictDetector(advancedConfig.conflictDetection);
    this.conflictResolver = new ConflictResolver(advancedConfig.conflictResolution);

    // 监听浏览器可见性变化
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          console.log('[TaskScheduler] 浏览器标签页重新激活，检查定时器状态');
          this.validateAllTimers();
        }
      });

      // 监听窗口焦点变化
      window.addEventListener('focus', () => {
        console.log('[TaskScheduler] 窗口重新获得焦点，检查定时器状态');
        this.validateAllTimers();
      });
    }
  }

  public static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  /**
   * 获取最后一次执行错误
   */
  public getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * 检查任务是否正在执行
   */
  public isTaskRunning(taskId: string): boolean {
    return this.currentExecution.has(taskId);
  }

  /**
   * 手动执行任务（公开方法）
   */
  public async executeTaskManually(task: ScheduledTask): Promise<void> {
    console.log(`[TaskScheduler] 手动执行任务: ${task.id} - ${task.name}`);

    // 检查任务是否已在执行中
    if (this.currentExecution.has(task.id)) {
      throw new Error(`任务 ${task.name} 已在执行中，请等待完成`);
    }

    // 使用分布式锁检查
    const isLocked = await DistributedLock.isLocked(`task_${task.id}`);
    if (isLocked) {
      throw new Error(`任务 ${task.name} 已被其他进程锁定，请稍后再试`);
    }

    // 检查任务是否启用
    if (!task.enabled) {
      console.warn(`[TaskScheduler] 任务 ${task.id} 已禁用，但允许手动执行`);
    }

    // 执行任务
    await this.executeTask(task);
  }

  /**
   * 获取调度器状态信息
   */
  public getSchedulerStatus(): {
    isInitialized: boolean;
    activeTimers: number;
    runningTasks: number;
    timerDetails: Array<{taskId: string, nextRun?: string}>;
  } {
    const timerDetails: Array<{taskId: string, nextRun?: string}> = [];

    // 获取所有定时器的详细信息
    this.timers.forEach((timer, taskId) => {
      timerDetails.push({ taskId });
    });

    return {
      isInitialized: this.isInitialized,
      activeTimers: this.timers.size,
      runningTasks: this.currentExecution.size,
      timerDetails
    };
  }

  /**
   * 初始化调度器，加载所有定时任务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[TaskScheduler] 调度器已初始化，跳过');
      return;
    }

    try {
      // 初始化分布式锁系统
      DistributedLock.initialize();
      
      // 初始化存储同步管理器
      await StorageSyncManager.initialize();
      
      // 启动性能监控
      const config = configManager.getConfig();
      if (config.enablePerformanceMonitoring) {
        performanceMonitor.startMonitoring(30000); // 30秒间隔
      }

      // 清除所有现有的定时器
      this.clearAllTimers();

      // 验证和修复任务关联
      console.log('[TaskScheduler] 验证任务关联...');
      const validationResult = await StorageManager.validateAndFixTaskAssociations();

      if (validationResult.invalidTasks > 0) {
        console.log(`[TaskScheduler] 任务关联验证结果: 总任务=${validationResult.totalTasks}, 无效=${validationResult.invalidTasks}, 修复=${validationResult.fixedTasks}, 删除=${validationResult.deletedTasks}`);

        // 记录详细信息
        validationResult.details.forEach(detail => {
          console.log(`[TaskScheduler] ${detail}`);
        });
      }

      // 加载所有定时任务（已经过验证和修复）
      const tasks = await StorageManager.getScheduledTasks();

      // 同步任务到服务端
      await this.syncTasksToServer(tasks);

      // 检查是否有错过的任务需要立即执行
      await this.checkMissedTasks(tasks);

      // 为每个启用的任务设置定时器
      const enabledTasks = tasks.filter(task => task.enabled);
      enabledTasks.forEach(task => {
        this.scheduleTask(task);
      });

      // 启动定期验证任务关联的定时器（每小时检查一次）
      this.startPeriodicValidation();

      // 启动定期检查错过任务的定时器（每10分钟检查一次）
      this.startMissedTasksCheck();

      // 启动定期清理已完结项目的任务（每小时检查一次）
      this.startCompletedProjectsCleanup();

      // 启动定期验证所有定时器（每30分钟检查一次）
      this.startPeriodicTimerValidation();

      this.isInitialized = true;
      console.log(`[TaskScheduler] 初始化完成，已加载 ${tasks.length} 个定时任务 (${enabledTasks.length} 个已启用)`);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error('[TaskScheduler] 初始化失败:', error);
    }
  }

  /**
   * 启动定期验证任务关联
   */
  private startPeriodicValidation(): void {
    // 清除现有的验证定时器
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }

    // 设置每小时验证一次任务关联
    this.validationTimer = setInterval(async () => {
      try {
        console.log('[TaskScheduler] 执行定期任务关联验证');
        const result = await StorageManager.validateAndFixTaskAssociations();

        if (result.invalidTasks > 0) {
          console.log(`[TaskScheduler] 定期验证发现并处理了 ${result.invalidTasks} 个无效任务`);

          // 如果有任务被修复或删除，重新初始化调度器
          if (result.fixedTasks > 0 || result.deletedTasks > 0) {
            console.log(`[TaskScheduler] 任务关联已更新，重新初始化调度器`);
            this.isInitialized = false;
            await this.initialize();
          }
        }
      } catch (error) {
        console.error('[TaskScheduler] 定期验证任务关联失败:', error);
      }
    }, 60 * 60 * 1000); // 每小时执行一次

    console.log('[TaskScheduler] 已启动定期任务关联验证 (每小时一次)');
  }

  /**
   * 停止定期验证
   */
  private stopPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
      console.log('[TaskScheduler] 已停止定期任务关联验证');
    }
  }

  /**
   * 启动定期检查错过的任务
   */
  private missedTasksTimer: NodeJS.Timeout | null = null;

  private startMissedTasksCheck(): void {
    // 清除现有的错过任务检查定时器
    if (this.missedTasksTimer) {
      clearInterval(this.missedTasksTimer);
    }

    // 每10分钟检查一次错过的任务
    this.missedTasksTimer = setInterval(async () => {
      try {
        console.log('[TaskScheduler] 执行定期错过任务检查');
        const tasks = await StorageManager.getScheduledTasks();
        await this.checkMissedTasks(tasks);
      } catch (error) {
        console.error('[TaskScheduler] 定期检查错过任务失败:', error);
      }
    }, 10 * 60 * 1000); // 每10分钟执行一次

    console.log('[TaskScheduler] 已启动定期错过任务检查 (每10分钟一次)');
  }

  /**
   * 停止定期检查错过的任务
   */
  private stopMissedTasksCheck(): void {
    if (this.missedTasksTimer) {
      clearInterval(this.missedTasksTimer);
      this.missedTasksTimer = null;
      console.log('[TaskScheduler] 已停止定期错过任务检查');
    }
  }

  /**
   * 启动定期清理已完结项目的任务
   */
  private completedProjectsCleanupTimer: NodeJS.Timeout | null = null;

  private startCompletedProjectsCleanup(): void {
    // 清除现有的清理定时器
    if (this.completedProjectsCleanupTimer) {
      clearInterval(this.completedProjectsCleanupTimer);
    }

    // 每小时检查一次已完结项目的任务清理
    this.completedProjectsCleanupTimer = setInterval(async () => {
      try {
        console.log('[TaskScheduler] 执行定期已完结项目任务清理检查');
        await this.cleanupCompletedProjectTasks();
      } catch (error) {
        console.error('[TaskScheduler] 定期清理已完结项目任务失败:', error);
      }
    }, 60 * 60 * 1000); // 每小时执行一次

    console.log('[TaskScheduler] 已启动定期已完结项目任务清理 (每小时一次)');
  }

  /**
   * 停止定期清理已完结项目的任务
   */
  private stopCompletedProjectsCleanup(): void {
    if (this.completedProjectsCleanupTimer) {
      clearInterval(this.completedProjectsCleanupTimer);
      this.completedProjectsCleanupTimer = null;
      console.log('[TaskScheduler] 已停止定期已完结项目任务清理');
    }
  }

  /**
   * 启动定期验证所有定时器
   */
  private periodicTimerValidationTimer: NodeJS.Timeout | null = null;

  private startPeriodicTimerValidation(): void {
    // 清除现有的验证定时器
    if (this.periodicTimerValidationTimer) {
      clearInterval(this.periodicTimerValidationTimer);
    }

    // 每30分钟验证一次所有定时器
    this.periodicTimerValidationTimer = setInterval(async () => {
      try {
        console.log('[TaskScheduler] 执行定期定时器验证');
        await this.validateAllTimers();
      } catch (error) {
        console.error('[TaskScheduler] 定期定时器验证失败:', error);
      }
    }, 30 * 60 * 1000); // 每30分钟执行一次

    console.log('[TaskScheduler] 已启动定期定时器验证 (每30分钟一次)');
  }

  /**
   * 停止定期验证所有定时器
   */
  private stopPeriodicTimerValidation(): void {
    if (this.periodicTimerValidationTimer) {
      clearInterval(this.periodicTimerValidationTimer);
      this.periodicTimerValidationTimer = null;
      console.log('[TaskScheduler] 已停止定期定时器验证');
    }
  }

  /**
   * 清理已完结项目的定时任务
   */
  private async cleanupCompletedProjectTasks(): Promise<void> {
    try {
      console.log('[TaskScheduler] 开始检查已完结项目的定时任务清理');

      // 获取所有定时任务
      const tasks = await StorageManager.getScheduledTasks();
      const enabledTasks = tasks.filter(task => task.enabled && task.action.autoDeleteWhenCompleted);

      if (enabledTasks.length === 0) {
        console.log('[TaskScheduler] 没有启用自动删除的定时任务，跳过清理');
        return;
      }

      console.log(`[TaskScheduler] 找到 ${enabledTasks.length} 个启用自动删除的定时任务，开始检查对应项目状态`);

      // 获取所有项目
      const items = await StorageManager.getItemsWithRetry();
      let deletedCount = 0;

      for (const task of enabledTasks) {
        try {
          // 查找对应的项目
          const relatedItem = items.find(item => item.id === task.itemId);

          if (!relatedItem) {
            console.log(`[TaskScheduler] 任务 ${task.name} 的关联项目不存在，跳过清理检查`);
            continue;
          }

          // 检查项目是否已完结
          const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;

          if (isCompleted) {
            console.log(`[TaskScheduler] 发现已完结项目 ${relatedItem.title} 的定时任务 ${task.name}，准备自动删除`);

            // 清除定时器
            if (this.timers.has(task.id)) {
              clearTimeout(this.timers.get(task.id));
              this.timers.delete(task.id);
              console.log(`[TaskScheduler] 清除任务 ${task.id} 的定时器`);
            }

            // 从存储中删除任务
            const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);

            if (deleteSuccess) {
              deletedCount++;
              console.log(`[TaskScheduler] ✓ 成功自动删除已完结项目的定时任务: ${task.name}`);
            } else {
              console.error(`[TaskScheduler] ✗ 自动删除定时任务失败: ${task.name}`);
            }
          }
        } catch (error) {
          console.error(`[TaskScheduler] 处理任务 ${task.id} 时出错:`, error);
        }
      }

      if (deletedCount > 0) {
        console.log(`[TaskScheduler] 定期清理完成，共删除 ${deletedCount} 个已完结项目的定时任务`);
      } else {
        console.log(`[TaskScheduler] 定期清理完成，没有需要删除的任务`);
      }

    } catch (error) {
      console.error(`[TaskScheduler] 清理已完结项目任务时出错:`, error);
    }
  }

  /**
   * 同步任务到服务端
   */
  private async syncTasksToServer(tasks: ScheduledTask[]): Promise<void> {
    try {
      console.log(`[TaskScheduler] 开始同步 ${tasks.length} 个任务到服务端`);

      const response = await fetch('/api/sync-scheduled-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`[TaskScheduler] 成功同步任务到服务端，共 ${result.syncedCount} 个任务`);
        } else {
          console.error(`[TaskScheduler] 同步任务到服务端失败:`, result.error);
        }
      } else {
        console.error(`[TaskScheduler] 同步任务到服务端失败，状态码: ${response.status}`);
      }
    } catch (error) {
      console.error(`[TaskScheduler] 同步任务到服务端时出错:`, error);
    }
  }

  /**
   * 检查错过的任务
   */
  private async checkMissedTasks(tasks: ScheduledTask[]): Promise<void> {
    const now = new Date();
    const enabledTasks = tasks.filter(task => task.enabled);

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
          console.log(`[TaskScheduler] 发现错过的任务: ${task.name} (${task.id}), 预定时间: ${nextRunTime.toLocaleString('zh-CN')}, 当前时间: ${now.toLocaleString('zh-CN')}`);

          // 检查任务是否正在执行中
          if (this.currentExecution.has(task.id)) {
            console.log(`[TaskScheduler] 任务 ${task.id} 正在执行中，跳过错过任务处理`);
            continue;
          }

          // 检查是否在合理的补偿时间窗口内（24小时内）
          if (timeDiff <= 24 * 60 * 60 * 1000) {
            console.log(`[TaskScheduler] 执行错过的任务: ${task.name} (${task.id})`);

            // 立即执行错过的任务
            await this.executeTask(task);
          } else {
            console.log(`[TaskScheduler] 任务 ${task.name} (${task.id}) 错过时间过长 (${Math.round(timeDiff / (60 * 60 * 1000))} 小时)，跳过执行并重新调度`);

            // 重新调度任务到下一个执行时间
            this.scheduleTask(task);
          }
        }
      } catch (error) {
        console.error(`[TaskScheduler] 检查错过任务失败 ${task.id}:`, error);
      }
    }
  }

  /**
   * 清除所有定时器
   */
  private clearAllTimers(): void {
    this.timers.forEach((timer, id) => {
      clearTimeout(timer);
      console.log(`[TaskScheduler] 清除定时器: ${id}`);
    });
    this.timers.clear();

    // 清除所有定时器验证
    this.timerValidations.forEach((timer, id) => {
      clearTimeout(timer);
      console.log(`[TaskScheduler] 清除定时器验证: ${id}`);
    });
    this.timerValidations.clear();

    // 同时清除所有后台定时器
    this.stopPeriodicValidation();
    this.stopMissedTasksCheck();
    this.stopCompletedProjectsCleanup();
    this.stopPeriodicTimerValidation();
  }

  /**
   * 计算下一次执行时间
   */
  private calculateNextRunTime(task: ScheduledTask): Date {
    const now = new Date();

    // 如果是每周执行
    if (task.schedule.type === 'weekly' && task.schedule.dayOfWeek !== undefined) {
      return this.calculateNextWeeklyRunTime(task, now);
    } else {
      // 每天执行
      const nextRun = new Date();
      nextRun.setHours(task.schedule.hour);
      nextRun.setMinutes(task.schedule.minute);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // 如果今天的时间已过，则设为明天
      if (now >= nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      // 确保时间不会设置到过去
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      console.log(`[TaskScheduler] 计算每日任务下次执行时间: ${task.name} -> ${nextRun.toLocaleString('zh-CN')} (当前时间: ${now.toLocaleString('zh-CN')})`);
      return nextRun;
    }
  }

  /**
   * 计算每周任务的下一次执行时间（支持双播出日）
   */
  private calculateNextWeeklyRunTime(task: ScheduledTask, now: Date): Date {
    const targetDays: number[] = [task.schedule.dayOfWeek!];

    // 如果有第二播出日，添加到目标日期列表
    if (task.schedule.secondDayOfWeek !== undefined) {
      targetDays.push(task.schedule.secondDayOfWeek);
    }

    // 获取当前是周几 (0-6, 0是周日)
    const currentDay = now.getDay();
    // 调整为我们的约定 (0-6, 0是周一)
    const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;

    let nearestNextRun: Date | null = null;
    let minDaysUntilTarget = Infinity;

    // 为每个目标日期计算下次执行时间
    for (const targetDay of targetDays) {
      const nextRun = new Date(now);
      nextRun.setHours(task.schedule.hour);
      nextRun.setMinutes(task.schedule.minute);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // 计算到目标日期的天数差
      let daysUntilTarget = targetDay - adjustedCurrentDay;
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7; // 如果是过去的日期，加上一周
      } else if (daysUntilTarget === 0 && now >= nextRun) {
        daysUntilTarget = 7; // 如果是今天但已经过了时间，设为下周
      }

      // 设置到正确的日期
      nextRun.setDate(now.getDate() + daysUntilTarget);

      // 确保时间不会设置到过去
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
        daysUntilTarget += 7;
      }

      // 选择最近的执行时间
      if (daysUntilTarget < minDaysUntilTarget) {
        minDaysUntilTarget = daysUntilTarget;
        nearestNextRun = nextRun;
      }
    }

    const result = nearestNextRun || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    console.log(`[TaskScheduler] 计算每周任务下次执行时间: ${task.name} -> ${result.toLocaleString('zh-CN')} (当前时间: ${now.toLocaleString('zh-CN')}, 目标星期: ${targetDays.join(',')})`);
    return result;
  }

  /**
   * 为任务设置定时器
   */
  public scheduleTask(task: ScheduledTask): void {
    if (!task.enabled) {
      console.log(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已禁用，不设置定时器`);
      return;
    }

    // 如果已有定时器，先清除
    if (this.timers.has(task.id)) {
      clearTimeout(this.timers.get(task.id));
      this.timers.delete(task.id);
      this.conflictDetector.unregisterTask(task.id);
      console.log(`[TaskScheduler] 清除任务 ${task.id} 的现有定时器`);
    }

    // 计算下一次执行时间
    let nextRunTime = this.calculateNextRunTime(task);
    let delay = nextRunTime.getTime() - Date.now();

    // 冲突检测和解决
    const conflicts = this.conflictDetector.detectConflicts(task, nextRunTime);
    if (conflicts.length > 0) {
      console.log(`[TaskScheduler] 检测到任务冲突: ${task.name}, 冲突数量: ${conflicts.length}`);

      const resolution = this.conflictResolver.resolveConflicts(task, nextRunTime, conflicts);
      if (resolution) {
        if (resolution.strategy === 'queue') {
          // 队列策略：将任务加入队列而不是设置定时器
          console.log(`[TaskScheduler] 任务 ${task.name} 采用队列策略，加入执行队列`);
          this.enqueueTask(task, resolution);
          return;
        } else if (resolution.newTime) {
          // 时间调整策略：使用新的执行时间
          nextRunTime = resolution.newTime;
          delay = nextRunTime.getTime() - Date.now();
          console.log(`[TaskScheduler] 任务 ${task.name} 时间已调整: ${nextRunTime.toLocaleString('zh-CN')}`);
        }
      }
    }

    // 如果延迟时间为负数或过小，设置一个最小延迟（10秒）
    const adjustedDelay = delay < 10000 ? 10000 : delay;
    
    // 更新任务的下一次执行时间
    this.updateTaskNextRunTime(task.id, nextRunTime.toISOString());
    
    // 设置定时器 - 增强版本，支持浏览器环境检测和自动重试
    const timer = setTimeout(async () => {
      console.log(`[TaskScheduler] 定时器触发: ${task.id} (${task.name}) 在 ${new Date().toLocaleString('zh-CN')}`);
      
      // 检查浏览器环境状态
      if (typeof window !== 'undefined' && document.hidden) {
        console.warn(`[TaskScheduler] 浏览器标签页不活跃，延迟执行任务: ${task.name}`);
        // 延迟30秒后重试
        setTimeout(() => this.executeTaskWithRetry(task), 30000);
        return;
      }
      
      // 在执行时获取最新的任务状态
      try {
        const tasks = await StorageManager.getScheduledTasks();
        const latestTask = tasks.find(t => t.id === task.id);

        if (latestTask && latestTask.enabled) {
          await this.executeTaskWithRetry(latestTask);
        } else {
          console.warn(`[TaskScheduler] 任务 ${task.id} 不存在或已禁用，跳过执行`);
        }
      } catch (error) {
        console.error(`[TaskScheduler] 获取最新任务状态失败，使用原始任务执行:`, error);
        await this.executeTaskWithRetry(task);
      }
    }, adjustedDelay);
    
    // 保存定时器引用
    this.timers.set(task.id, timer);
    
    // 格式化下一次执行时间为本地时间字符串
    const nextRunLocale = nextRunTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    console.log(`[TaskScheduler] 已为任务 ${task.id} 设置定时器，将在 ${nextRunLocale} 执行 (延迟 ${Math.round(adjustedDelay / 1000 / 60)} 分钟)`);

    // 注册任务到冲突检测器
    this.conflictDetector.registerScheduledTask(task, nextRunTime);

    // 设置定时器验证机制 - 每5分钟检查一次定时器是否还存在
    this.scheduleTimerValidation(task.id, adjustedDelay);
  }

  /**
   * 将任务加入队列（冲突解决策略）
   */
  private async enqueueTask(task: ScheduledTask, resolution: any): Promise<void> {
    try {
      // 这里需要集成任务队列系统
      // 由于现有的taskQueue可能不完全兼容，我们先用简单的延迟执行
      const delayMs = (resolution.queuePosition || 1) * 60000; // 每个队列位置延迟1分钟

      console.log(`[TaskScheduler] 任务 ${task.name} 将在 ${delayMs / 1000} 秒后执行（队列策略）`);

      setTimeout(async () => {
        console.log(`[TaskScheduler] 队列任务开始执行: ${task.name}`);
        await this.executeTaskWithRetry(task);
      }, delayMs);

    } catch (error) {
      console.error(`[TaskScheduler] 队列任务处理失败: ${task.name}`, error);
      // 如果队列失败，回退到普通调度
      this.scheduleTask(task);
    }
  }

  /**
   * 更新任务的下一次执行时间
   */
  private async updateTaskNextRunTime(taskId: string, nextRunTime: string): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        tasks[taskIndex].nextRun = nextRunTime;
        await StorageManager.updateScheduledTask(tasks[taskIndex]);
      } else {
        console.warn(`[TaskScheduler] 更新任务执行时间失败: 找不到ID为 ${taskId} 的任务`);
      }
    } catch (error) {
      console.error(`[TaskScheduler] 更新任务执行时间失败: ${error}`);
    }
  }

  /**
   * 设置单个定时器的验证机制
   */
  private scheduleTimerValidation(taskId: string, originalDelay: number): void {
    // 清除现有的验证定时器
    if (this.timerValidations.has(taskId)) {
      clearTimeout(this.timerValidations.get(taskId));
      this.timerValidations.delete(taskId);
    }

    // 设置验证间隔：原始延迟的一半，但不少于5分钟，不超过30分钟
    const validationInterval = Math.max(5 * 60 * 1000, Math.min(originalDelay / 2, 30 * 60 * 1000));

    const validationTimer = setTimeout(async () => {
      await this.validateSingleTimer(taskId);
    }, validationInterval);

    this.timerValidations.set(taskId, validationTimer);
    console.log(`[TaskScheduler] 为任务 ${taskId} 设置定时器验证，${Math.round(validationInterval / 60000)} 分钟后检查`);
  }

  /**
   * 验证单个定时器是否仍然有效
   */
  private async validateSingleTimer(taskId: string): Promise<void> {
    try {
      // 检查定时器是否还存在
      if (!this.timers.has(taskId)) {
        console.warn(`[TaskScheduler] 定时器验证失败: 任务 ${taskId} 的定时器已丢失，尝试重新设置`);
        
        // 获取任务信息并重新设置定时器
        const tasks = await StorageManager.getScheduledTasks();
        const task = tasks.find(t => t.id === taskId);
        
        if (task && task.enabled) {
          console.log(`[TaskScheduler] 重新设置丢失的定时器: ${task.name}`);
          this.scheduleTask(task);
        } else {
          console.warn(`[TaskScheduler] 无法重新设置定时器: 任务不存在或已禁用 (${taskId})`);
        }
      } else {
        // 定时器存在，检查是否应该已经执行了
        const tasks = await StorageManager.getScheduledTasks();
        const task = tasks.find(t => t.id === taskId);
        
        if (task && task.nextRun) {
          const nextRunTime = new Date(task.nextRun);
          const now = new Date();
          const timeDiff = now.getTime() - nextRunTime.getTime();
          
          // 如果已经超过执行时间5分钟以上，说明定时器可能有问题
          if (timeDiff > 5 * 60 * 1000) {
            console.warn(`[TaskScheduler] 定时器异常: 任务 ${task.name} 应该在 ${nextRunTime.toLocaleString('zh-CN')} 执行，但现在是 ${now.toLocaleString('zh-CN')}`);
            
            // 清除异常的定时器并重新设置
            if (this.timers.has(taskId)) {
              clearTimeout(this.timers.get(taskId));
              this.timers.delete(taskId);
            }
            
            // 立即执行错过的任务
            console.log(`[TaskScheduler] 立即执行错过的任务: ${task.name}`);
            await this.executeTaskWithRetry(task);
          } else {
            // 定时器正常，继续下一次验证
            this.scheduleTimerValidation(taskId, Math.max(nextRunTime.getTime() - now.getTime(), 5 * 60 * 1000));
          }
        }
      }
    } catch (error) {
      console.error(`[TaskScheduler] 验证定时器时出错 (${taskId}):`, error);
    }
  }

  /**
   * 验证所有定时器
   */
  private async validateAllTimers(): Promise<void> {
    try {
      console.log('[TaskScheduler] 开始验证所有定时器状态');
      const tasks = await StorageManager.getScheduledTasks();
      const enabledTasks = tasks.filter(task => task.enabled);
      
      for (const task of enabledTasks) {
        if (!this.timers.has(task.id)) {
          console.warn(`[TaskScheduler] 发现缺失的定时器: ${task.name}，重新设置`);
          this.scheduleTask(task);
        } else {
          // 验证现有定时器
          await this.validateSingleTimer(task.id);
        }
      }
      
      console.log(`[TaskScheduler] 定时器验证完成，当前活跃定时器: ${this.timers.size} 个`);
    } catch (error) {
      console.error('[TaskScheduler] 验证所有定时器时出错:', error);
    }
  }

  /**
   * 获取关联项目，包含多种备用策略
   */
  private async getRelatedItem(task: ScheduledTask): Promise<TMDBItem | null> {
    try {
      console.log(`[TaskScheduler] 获取关联项目: 任务ID=${task.id}, 项目ID=${task.itemId}, 项目标题="${task.itemTitle || '未知'}"`);
      
      let relatedItem: TMDBItem | null = null;
      const items = await StorageManager.getItemsWithRetry();
      console.log(`[TaskScheduler] 当前系统中共有 ${items.length} 个项目`);
      
      if (items.length === 0) {
        console.warn(`[TaskScheduler] 系统中没有可用项目，无法继续处理`);
        throw new Error(`系统中没有可用项目，请先添加项目`);
      }
      
      // 策略1：直接通过ID匹配
      const foundItem = items.find(item => item.id === task.itemId);
      if (foundItem) {
        console.log(`[TaskScheduler] 直接通过ID找到了项目: ${foundItem.title} (ID: ${foundItem.id})`);
        return foundItem;
      }
      
      console.warn(`[TaskScheduler] 未找到ID为 ${task.itemId} 的项目，尝试替代方案...`);
      
      // 策略2：通过TMDB ID匹配
      if (task.itemTmdbId) {
        console.log(`[TaskScheduler] 尝试通过TMDB ID匹配: ${task.itemTmdbId}`);
        const tmdbMatch = items.find(item => item.tmdbId === task.itemTmdbId);
        if (tmdbMatch) {
          console.log(`[TaskScheduler] 通过TMDB ID找到了项目: ${tmdbMatch.title} (ID: ${tmdbMatch.id})`);
          await this.updateTaskItemId(task.id, tmdbMatch.id);
          return tmdbMatch;
        }
      }
      
      // 策略3：通过标题精确匹配
      if (task.itemTitle) {
        console.log(`[TaskScheduler] 尝试通过标题精确匹配: "${task.itemTitle}"`);
        const titleMatch = items.find(item => item.title === task.itemTitle);
        if (titleMatch) {
          console.log(`[TaskScheduler] 通过标题精确匹配找到了项目: ${titleMatch.title} (ID: ${titleMatch.id})`);
          await this.updateTaskItemId(task.id, titleMatch.id);
          return titleMatch;
        }
      }
      
      // 策略4：通过标题模糊匹配
      if (task.itemTitle) {
        console.log(`[TaskScheduler] 尝试通过标题模糊匹配: "${task.itemTitle}"`);
        const possibleItems = items.filter(item => 
          (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 10) ||
          (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 10)
        );
        
        if (possibleItems.length > 0) {
          console.log(`[TaskScheduler] 通过标题模糊匹配找到了 ${possibleItems.length} 个可能的项目`);
          
          // 如果只有一个匹配项，直接使用
          if (possibleItems.length === 1) {
            const matchItem = possibleItems[0];
            console.log(`[TaskScheduler] 选择唯一的模糊匹配项: ${matchItem.title} (ID: ${matchItem.id})`);
            await this.updateTaskItemId(task.id, matchItem.id);
            return matchItem;
          }
          
          // 如果有多个，尝试找到与任务创建时间最接近的项目
          const sameTypeItems = [...possibleItems].sort((a, b) => 
            Math.abs(new Date(a.createdAt).getTime() - new Date(task.createdAt).getTime()) -
            Math.abs(new Date(b.createdAt).getTime() - new Date(task.createdAt).getTime())
          );
          const bestMatch = sameTypeItems[0];
          console.log(`[TaskScheduler] 从多个同类型候选项中选择创建时间最接近的: ${bestMatch.title} (ID: ${bestMatch.id})`);
          await this.updateTaskItemId(task.id, bestMatch.id);
          return bestMatch;
        }
      }
      
      // 策略5：尝试紧急修复 - 检查特定问题ID
      if (task.itemId === "1749566411729") {
        console.log(`[TaskScheduler] 检测到问题ID 1749566411729，尝试应用特殊修复...`);
        
        // 检查是否有最近创建的项目可能是此ID的正确对应项
        const recentItems = [...items].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 10); // 获取最近创建的10个项目
        
        console.log(`[TaskScheduler] 最近创建的项目: ${recentItems.map(item => `${item.title} (ID: ${item.id}, 创建时间: ${item.createdAt})`).join(', ')}`);
        
        if (recentItems.length > 0) {
          // 选择第一个项目作为应急措施
          const emergencyItem = recentItems[0];
          console.log(`[TaskScheduler] 应急修复: 将使用最近创建的项目 ${emergencyItem.title} (ID: ${emergencyItem.id}) 替代问题ID`);
          await this.updateTaskItemId(task.id, emergencyItem.id);
          return emergencyItem;
        }
      }
      
      // 策略6：任务名称解析匹配 - 尝试从任务名称中提取可能的项目标题
      const taskNameWithoutSuffix = task.name.replace(/\s*定时任务$/, '');
      console.log(`[TaskScheduler] 尝试通过任务名称匹配: "${taskNameWithoutSuffix}"`);
      
      const nameMatchItems = items.filter(item => 
        (item.title.includes(taskNameWithoutSuffix) && item.title.length - taskNameWithoutSuffix.length < 15) ||
        (taskNameWithoutSuffix.includes(item.title) && taskNameWithoutSuffix.length - item.title.length < 15)
      );
      
      if (nameMatchItems.length > 0) {
        // 如果只有一个匹配项，直接使用
        if (nameMatchItems.length === 1) {
          const nameMatch = nameMatchItems[0];
          console.log(`[TaskScheduler] 通过任务名称找到匹配项: ${nameMatch.title} (ID: ${nameMatch.id})`);
          await this.updateTaskItemId(task.id, nameMatch.id);
          return nameMatch;
        }
        
        // 如果有多个，使用创建时间最接近的
        const sortedByDate = [...nameMatchItems].sort((a, b) => 
          Math.abs(new Date(a.createdAt).getTime() - new Date(task.createdAt).getTime()) -
          Math.abs(new Date(b.createdAt).getTime() - new Date(task.createdAt).getTime())
        );
        
        const closestMatch = sortedByDate[0];
        console.log(`[TaskScheduler] 从多个名称匹配项中选择创建时间最接近的: ${closestMatch.title} (ID: ${closestMatch.id})`);
        await this.updateTaskItemId(task.id, closestMatch.id);
        return closestMatch;
      }
      
      // 策略7：完全备用 - 如果所有策略都失败，使用最近创建的项目
      console.warn(`[TaskScheduler] 所有匹配策略均失败，尝试使用最近创建的项目作为备用`);
      
      const sortedByDate = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedByDate.length > 0) {
        const lastResortItem = sortedByDate[0];
        console.log(`[TaskScheduler] 备用策略: 使用最近创建的项目 ${lastResortItem.title} (ID: ${lastResortItem.id})`);
        await this.updateTaskItemId(task.id, lastResortItem.id);
        return lastResortItem;
      }
      
      // 如果所有策略都失败，返回null
      console.warn(`[TaskScheduler] 无法找到任务 ${task.id} (${task.name}) 的关联项目，所有匹配策略均失败`);
      
      // 创建一个特殊错误
      const error = new Error(`找不到项目ID ${task.itemId}，请尝试对任务进行重新关联或删除`);
      error.name = "ItemNotFoundError";
      this.lastError = error;
      
      return null;
    } catch (error) {
      console.error(`[TaskScheduler] 获取关联项目失败:`, error);
      return null;
    }
  }
  
  /**
   * 更新任务的itemId
   */
  private async updateTaskItemId(taskId: string, newItemId: string): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex !== -1) {
        tasks[taskIndex].itemId = newItemId;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        await StorageManager.updateScheduledTask(tasks[taskIndex]);
        console.log(`[TaskScheduler] 已更新任务 ${taskId} 的itemId为 ${newItemId}`);
      }
    } catch (error) {
      console.error(`[TaskScheduler] 更新任务itemId失败:`, error);
    }
  }

  /**
   * 执行定时任务（带重试机制）
   */
  private async executeTaskWithRetry(task: ScheduledTask, retryCount: number = 0): Promise<void> {
    const maxRetries = 3;
    const currentTime = new Date().toLocaleString('zh-CN');
    console.log(`[TaskScheduler] 准备执行任务: ${task.id} (${task.name}) 在 ${currentTime} (重试次数: ${retryCount})`);

    // 如果任务已在执行中，跳过本次执行
    if (this.currentExecution.has(task.id)) {
      console.warn(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已在执行中，跳过本次执行`);
      // 重新调度任务
      this.scheduleTask(task);
      return;
    }

    // 检查任务是否仍然启用
    if (!task.enabled) {
      console.warn(`[TaskScheduler] 任务 ${task.id} (${task.name}) 已禁用，跳过执行`);
      return;
    }
    
    try {
      // 执行任务
      await this._executeTaskInternal(task);
    } catch (error) {
      console.error(`[TaskScheduler] 任务执行失败: ${task.name}, 错误:`, error);
      
      // 如果还有重试次数，延迟后重试
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 60000; // 指数退避：1分钟、2分钟、4分钟
        console.log(`[TaskScheduler] 将在 ${retryDelay / 60000} 分钟后重试任务: ${task.name} (第${retryCount + 1}次重试)`);
        
        setTimeout(() => {
          this.executeTaskWithRetry(task, retryCount + 1);
        }, retryDelay);
      } else {
        console.error(`[TaskScheduler] 任务 ${task.name} 重试次数已用完，放弃执行`);
        // 仍然重新调度到下一个执行时间
        this.scheduleTask(task);
      }
    }
  }

  /**
   * 执行定时任务（原方法保持兼容性）
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    await this.executeTaskWithRetry(task, 0);
  }
  
  /**
   * 任务执行的内部实现
   */
  private async _executeTaskInternal(task: ScheduledTask): Promise<void> {
    // 获取分布式锁
    const lockKey = `task_${task.id}`;
    const lockResult = await DistributedLock.acquireLock(lockKey, 'task_execution', 10 * 60 * 1000); // 10分钟超时
    
    if (!lockResult.success) {
      console.warn(`[TaskScheduler] 无法获取任务执行锁: ${task.name}, 原因: ${lockResult.error}`);
      // 重新调度任务
      this.scheduleTask(task);
      return;
    }

    // 标记任务开始执行
    this.currentExecution.add(task.id);

    try {
      // 开始执行日志记录
      try {
        await taskExecutionLogger.startTaskExecution(task.id);
      } catch (logError) {
        console.error(`[TaskScheduler] 启动执行日志记录失败:`, logError);
      }

      console.log(`[TaskScheduler] 开始执行任务: ${task.id} - ${task.name}`);

      try {
        await taskExecutionLogger.addLog(task.id, '初始化', `开始执行任务: ${task.name}`, 'info');
      } catch (logError) {
        console.error(`[TaskScheduler] 记录初始化日志失败:`, logError);
      }

      // 更新任务的最后执行时间
      const updatedTask = { ...task, lastRun: new Date().toISOString() };
      await StorageManager.updateScheduledTask(updatedTask);

      try {
        await taskExecutionLogger.updateProgress(task.id, 5);
      } catch (logError) {
        console.error(`[TaskScheduler] 记录初始进度失败:`, logError);
      }
      
      // 执行TMDB-Import任务
      if (task.type === 'tmdb-import') {
        try {
          // 首先获取关联的项目
          let relatedItem = await this.getRelatedItem(task);

          if (!relatedItem) {
            console.warn(`[TaskScheduler] 任务 ${task.name} 的关联项目不存在，尝试重新关联`);

            // 尝试重新关联项目
            const result = await this.attemptToRelinkTask(task);
            if (!result.success) {
              // 如果重新关联失败，尝试使用存储管理器的修复方法
              console.warn(`[TaskScheduler] 重新关联失败，尝试使用存储管理器修复`);
              const items = await StorageManager.getItemsWithRetry();
              const fixResult = await StorageManager['attemptToFixTaskAssociation'](task, items);

              if (fixResult.success && fixResult.newItemId) {
                // 更新任务关联
                const updatedTask = {
                  ...task,
                  itemId: fixResult.newItemId,
                  itemTitle: fixResult.newItemTitle || task.itemTitle,
                  itemTmdbId: fixResult.newItemTmdbId || task.itemTmdbId,
                  updatedAt: new Date().toISOString()
                };

                await StorageManager.updateScheduledTask(updatedTask);
                relatedItem = await this.getRelatedItem(updatedTask);

                if (relatedItem) {
                  console.log(`[TaskScheduler] 成功修复任务关联: ${task.name} -> ${relatedItem.title}`);
                } else {
                  throw new Error(`修复任务关联后仍无法找到项目 (itemId: ${fixResult.newItemId})`);
                }
              } else {
                throw new Error(result.message || `找不到任务关联的项目且无法修复 (itemId: ${task.itemId}, 名称: ${task.itemTitle || task.name})`);
              }
            } else {
              // 使用重新关联的项目
              const updatedTask = {...task, itemId: result.newItemId as string};
              relatedItem = await this.getRelatedItem(updatedTask);

              if (!relatedItem) {
                throw new Error(`重新关联项目失败，仍然找不到有效项目 (itemId: ${result.newItemId})`);
              }

              // 更新任务的项目ID
              await this.updateTaskItemId(task.id, result.newItemId as string);
              console.log(`[TaskScheduler] 成功重新关联任务: ${task.name} -> ${relatedItem.title}`);
            }
          }

          // 验证项目的有效性
          if (!relatedItem) {
            throw new Error(`无法获取有效的关联项目`);
          }

          // 检查项目是否有指定的季数
          if (task.action.seasonNumber > 0 && relatedItem.mediaType === 'tv') {
            if (!relatedItem.seasons || !relatedItem.seasons.some(s => s.seasonNumber === task.action.seasonNumber)) {
              throw new Error(`项目 ${relatedItem.title} 没有第 ${task.action.seasonNumber} 季`);
            }
          }

          // 检查项目是否有平台URL
          if (!relatedItem.platformUrl) {
            throw new Error(`项目 ${relatedItem.title} 没有设置平台URL，无法执行TMDB-Import任务`);
          }

          // 执行导入任务
          await this.executeTMDBImportTask(task, relatedItem);

          console.log(`[TaskScheduler] 任务执行成功: ${task.id} - ${task.name}`);
          await taskExecutionLogger.addLog(task.id, '完成', '任务执行成功', 'success');

          // 更新任务状态，标记为成功
          const successTask = {
            ...updatedTask,
            lastRunStatus: 'success' as const,
            lastRunError: null
          };

          // 发送实时同步通知
          try {
            await realtimeSyncManager.notifyDataChange({
              type: 'task_completed',
              data: {
                taskId: task.id,
                taskName: task.name,
                itemId: task.itemId,
                itemTitle: relatedItem?.title,
                completedAt: new Date().toISOString()
              }
            });
            console.log(`[TaskScheduler] 已发送任务完成通知: ${task.name}`);
          } catch (syncError) {
            console.error(`[TaskScheduler] 发送实时同步通知失败:`, syncError);
          }
          await StorageManager.updateScheduledTask(successTask);

          // 结束执行日志记录
          try {
            await taskExecutionLogger.endTaskExecution(task.id, true);
          } catch (logError) {
            console.error(`[TaskScheduler] 结束执行日志记录失败:`, logError);
          }

          // 检查是否需要自动删除已完结项目的任务
          const shouldAutoDelete = await this.checkAndHandleCompletedProject(successTask, relatedItem);

          if (!shouldAutoDelete) {
            // 只有在不需要自动删除时才重新调度
            this.scheduleTask(successTask);
          }
        } catch (importError) {
          console.error(`[TaskScheduler] TMDB-Import任务执行失败:`, importError);

          // 使用浏览器中断检测器分析错误
          const interruptResult = BrowserInterruptDetector.analyzeError(importError);
          const errorMessage = importError instanceof Error ? importError.message : String(importError);

          console.log(`[TaskScheduler] 错误分析结果:`, interruptResult);

          if (interruptResult.isUserInterrupted) {
            // 用户中断：记录为用户操作，不作为错误处理
            const userMessage = BrowserInterruptDetector.generateUserFriendlyMessage(interruptResult);
            await taskExecutionLogger.addLog(task.id, '用户中断', userMessage, 'warning');

            // 更新任务状态，标记为用户中断
            const interruptedTask = {
              ...updatedTask,
              lastRunStatus: 'user_interrupted' as const,
              lastRunError: userMessage
            };

            await StorageManager.updateScheduledTask(interruptedTask);

            // 结束执行日志记录
            try {
              await taskExecutionLogger.endTaskExecution(task.id, false, userMessage);
            } catch (logError) {
              console.error(`[TaskScheduler] 结束执行日志记录失败:`, logError);
            }

            // 用户中断的任务仍然重新调度，但不增加错误计数
            this.scheduleTask(interruptedTask);

          } else {
            // 系统错误：按原有逻辑处理
            await taskExecutionLogger.addLog(task.id, '错误', `任务执行失败: ${errorMessage}`, 'error');

            // 更新任务状态，标记为失败
            const failedTask = {
              ...updatedTask,
              lastRunStatus: 'failed' as const,
              lastRunError: errorMessage
            };

            // 发送实时同步通知
            try {
              await realtimeSyncManager.notifyDataChange({
                type: 'task_status_changed',
                data: {
                  taskId: task.id,
                  taskName: task.name,
                  status: 'failed',
                  error: errorMessage,
                  failedAt: new Date().toISOString()
                }
              });
              console.log(`[TaskScheduler] 已发送任务失败通知: ${task.name}`);
            } catch (syncError) {
              console.error(`[TaskScheduler] 发送实时同步通知失败:`, syncError);
            }

            await StorageManager.updateScheduledTask(failedTask);

            // 结束执行日志记录
            try {
              await taskExecutionLogger.endTaskExecution(task.id, false, errorMessage);
            } catch (logError) {
              console.error(`[TaskScheduler] 结束执行日志记录失败:`, logError);
            }

            // 检查是否需要自动删除已完结项目的任务（即使任务失败也要检查）
            const shouldAutoDelete = await this.checkAndHandleCompletedProject(failedTask, relatedItem);

            if (!shouldAutoDelete) {
              // 只有在不需要自动删除时才重新调度
              this.scheduleTask(failedTask);
            }

            // 重新抛出错误，让外层捕获
            throw importError;
          }
        }
      } else {
        console.warn(`[TaskScheduler] 未知的任务类型: ${task.type}`);
        // 对于未知类型的任务，也要重新调度
        this.scheduleTask(updatedTask);
      }

      // 注意：成功和失败的重新调度已经在各自的分支中处理了
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[TaskScheduler] 执行任务失败:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 如果任务执行日志还在记录中，结束它
      if (taskExecutionLogger.isTaskRunning(task.id)) {
        try {
          await taskExecutionLogger.endTaskExecution(task.id, false, errorMessage);
        } catch (logError) {
          console.error(`[TaskScheduler] 结束执行日志记录失败:`, logError);
        }
      }

      // 对于未捕获的错误，使用原始任务重新调度
      // 但首先尝试更新任务状态
      try {
        const errorTask = {
          ...task,
          lastRun: new Date().toISOString(),
          lastRunStatus: 'failed' as const,
          lastRunError: errorMessage
        };
        await StorageManager.updateScheduledTask(errorTask);
        this.scheduleTask(errorTask);
      } catch (updateError) {
        console.error(`[TaskScheduler] 更新任务状态失败:`, updateError);
        // 如果更新失败，使用原始任务重新调度
        this.scheduleTask(task);
      }
    } finally {
      // 释放分布式锁
      await DistributedLock.releaseLock(lockKey);
      
      // 确保无论如何都清理执行状态
      this.currentExecution.delete(task.id);
      console.log(`[TaskScheduler] 任务执行完成，已释放锁和清理状态: ${task.id}`);
    }
  }

  /**
   * 尝试重新关联任务到有效项目
   */
  private async attemptToRelinkTask(task: ScheduledTask): Promise<{success: boolean, message?: string, newItemId?: string}> {
    try {
      console.log(`[TaskScheduler] 尝试重新关联任务 ${task.id} (${task.name})`);
      
      // 获取所有项目
      const items = await StorageManager.getItemsWithRetry();
      
      if (items.length === 0) {
        return {
          success: false,
          message: "系统中没有任何项目，无法关联任务"
        };
      }
      
      // 策略1: 通过TMDB ID匹配
      if (task.itemTmdbId) {
        console.log(`[TaskScheduler] 尝试通过TMDB ID (${task.itemTmdbId}) 匹配项目`);
        const matchByTmdbId = items.find(item => item.tmdbId === task.itemTmdbId);
        
        if (matchByTmdbId) {
          console.log(`[TaskScheduler] 通过TMDB ID匹配到项目: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`);
          return {
            success: true,
            message: `已通过TMDB ID关联到项目 ${matchByTmdbId.title}`,
            newItemId: matchByTmdbId.id
          };
        }
      }
      
      // 策略2: 通过项目标题匹配
      if (task.itemTitle) {
        console.log(`[TaskScheduler] 尝试通过标题 (${task.itemTitle}) 匹配项目`);
        
        // 模糊匹配
        const matchByTitle = items.find(item => 
          item.title === task.itemTitle ||
          (item.title.includes(task.itemTitle) && item.title.length - task.itemTitle.length < 10) ||
          (task.itemTitle.includes(item.title) && task.itemTitle.length - item.title.length < 10)
        );
        
        if (matchByTitle) {
          console.log(`[TaskScheduler] 通过标题匹配到项目: ${matchByTitle.title} (ID: ${matchByTitle.id})`);
          return {
            success: true,
            message: `已通过标题关联到项目 ${matchByTitle.title}`,
            newItemId: matchByTitle.id
          };
        }
      }
      
      // 策略3: 通过任务名称提取可能的标题
      if (task.name) {
        const possibleTitle = task.name.replace(/\s*定时任务$/, '');
        console.log(`[TaskScheduler] 尝试通过任务名称提取的标题 (${possibleTitle}) 匹配项目`);
        
        // 模糊匹配
        const matchByTaskName = items.find(item => 
          item.title === possibleTitle ||
          (item.title.includes(possibleTitle) && item.title.length - possibleTitle.length < 10) ||
          (possibleTitle.includes(item.title) && possibleTitle.length - item.title.length < 10)
        );
        
        if (matchByTaskName) {
          console.log(`[TaskScheduler] 通过任务名称匹配到项目: ${matchByTaskName.title} (ID: ${matchByTaskName.id})`);
          return {
            success: true,
            message: `已通过任务名称关联到项目 ${matchByTaskName.title}`,
            newItemId: matchByTaskName.id
          };
        }
      }
      
      // 策略4: 使用最近创建的项目作为最后手段
      console.log(`[TaskScheduler] 使用最近创建的项目作为最后手段`);
      
      // 按创建时间排序
      const sortedItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedItems.length > 0) {
        const fallbackItem = sortedItems[0];
        console.log(`[TaskScheduler] 使用最近创建的项目: ${fallbackItem.title} (ID: ${fallbackItem.id})`);
        
        return {
          success: true,
          message: `已关联到最近创建的项目 ${fallbackItem.title}`,
          newItemId: fallbackItem.id
        };
      }
      
      return {
        success: false,
        message: "无法找到合适的项目进行关联"
      };
    } catch (error) {
      console.error(`[TaskScheduler] 重新关联任务失败:`, error);
      return {
        success: false,
        message: `重新关联任务失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 执行TMDB-Import任务 - 新的完整工作流程
   */
  private async executeTMDBImportTask(task: ScheduledTask, item: TMDBItem): Promise<void> {
    try {
      console.log(`[TaskScheduler] 开始执行完整的TMDB-Import工作流程: ${item.title}`);
      console.log(`[TaskScheduler] 传入的项目ID: ${item.id}, 任务关联的项目ID: ${task.itemId}`);

      try {
        await taskExecutionLogger.addLog(task.id, '准备', `开始TMDB-Import工作流程: ${item.title}`, 'info');
        await taskExecutionLogger.updateProgress(task.id, 10);
      } catch (logError) {
        console.error(`[TaskScheduler] 记录初始日志失败:`, logError);
      }

      // 获取最新的项目数据，确保整个流程使用一致的数据
      const latestItems = await StorageManager.getItemsWithRetry();
      console.log(`[TaskScheduler] 当前存储中有 ${latestItems.length} 个项目`);

      try {
        await taskExecutionLogger.addLog(task.id, '验证项目', `获取到 ${latestItems.length} 个项目数据`, 'info');
      } catch (logError) {
        console.error(`[TaskScheduler] 记录验证项目日志失败:`, logError);
      }

      let currentItem = latestItems.find(i => i.id === item.id);

      if (!currentItem) {
        console.warn(`[TaskScheduler] 无法通过传入ID ${item.id} 找到项目，尝试其他方式...`);

        // 尝试通过任务的itemId查找
        if (task.itemId && task.itemId !== item.id) {
          console.log(`[TaskScheduler] 尝试使用任务关联的项目ID: ${task.itemId}`);
          currentItem = latestItems.find(i => i.id === task.itemId);

          if (currentItem) {
            console.log(`[TaskScheduler] ✓ 通过任务关联ID找到项目: ${currentItem.title}`);
          }
        }

        // 尝试通过标题查找
        if (!currentItem && item.title) {
          console.log(`[TaskScheduler] 尝试通过标题查找: ${item.title}`);
          currentItem = latestItems.find(i => i.title === item.title);

          if (currentItem) {
            console.log(`[TaskScheduler] ✓ 通过标题找到项目: ${currentItem.title} (ID: ${currentItem.id})`);
          }
        }

        // 尝试通过任务标题查找
        if (!currentItem && task.itemTitle) {
          console.log(`[TaskScheduler] 尝试通过任务标题查找: ${task.itemTitle}`);
          currentItem = latestItems.find(i => i.title === task.itemTitle);

          if (currentItem) {
            console.log(`[TaskScheduler] ✓ 通过任务标题找到项目: ${currentItem.title} (ID: ${currentItem.id})`);
          }
        }

        if (!currentItem) {
          console.error(`[TaskScheduler] 所有查找方式都失败了`);
          console.log(`[TaskScheduler] 可用的项目:`, latestItems.map(i => ({ id: i.id, title: i.title })));
          throw new Error(`无法找到项目。尝试的ID: ${item.id}, 任务ID: ${task.itemId}, 标题: ${item.title || task.itemTitle}`);
        }
      }

      console.log(`[TaskScheduler] 使用项目数据: ${currentItem.title} (ID: ${currentItem.id})`);

      // 验证基本条件
      if (!currentItem.platformUrl) {
        throw new Error(`项目 ${currentItem.title} 缺少平台URL，无法执行TMDB导入`);
      }

      if (task.action.seasonNumber > 0 && currentItem.mediaType === 'tv') {
        if (!currentItem.seasons || !currentItem.seasons.some(s => s.seasonNumber === task.action.seasonNumber)) {
          throw new Error(`项目 ${currentItem.title} 没有第 ${task.action.seasonNumber} 季，请检查季数设置`);
        }
      }

      // 步骤1: 播出平台抓取
      let extractResult;
      try {
        console.log(`[TaskScheduler] 步骤1: 执行播出平台抓取`);
        await taskExecutionLogger.startStep(task.id, '步骤1');
        await taskExecutionLogger.addLog(task.id, '步骤1', '开始播出平台抓取', 'info');
        await taskExecutionLogger.updateProgress(task.id, 20);

        console.log(`[TaskScheduler] 步骤1: 调用executePlatformExtraction，参数: item=${currentItem.title}, season=${task.action.seasonNumber}`);
        extractResult = await this.executePlatformExtraction(currentItem, task.action.seasonNumber);
        console.log(`[TaskScheduler] 步骤1: executePlatformExtraction返回结果:`, extractResult);

        if (!extractResult.success) {
          try {
            await taskExecutionLogger.addLog(task.id, '步骤1', `播出平台抓取失败: ${extractResult.error}`, 'error');
          } catch (logError) {
            console.error(`[TaskScheduler] 记录日志失败:`, logError);
          }
          throw new Error(`播出平台抓取失败: ${extractResult.error}`);
        }

        try {
          await taskExecutionLogger.addLog(task.id, '步骤1', `播出平台抓取成功，生成CSV: ${extractResult.csvPath}`, 'success');
          await taskExecutionLogger.updateProgress(task.id, 30);
          await taskExecutionLogger.completeStep(task.id, '步骤1', true);
        } catch (logError) {
          console.error(`[TaskScheduler] 记录日志失败:`, logError);
        }
        console.log(`[TaskScheduler] 步骤1: 播出平台抓取成功完成`);

      } catch (step1Error) {
        console.error(`[TaskScheduler] 步骤1执行过程中发生错误:`, step1Error);
        await taskExecutionLogger.addLog(task.id, '步骤1', `执行过程中发生错误: ${step1Error instanceof Error ? step1Error.message : String(step1Error)}`, 'error');
        await taskExecutionLogger.completeStep(task.id, '步骤1', false, step1Error instanceof Error ? step1Error.message : String(step1Error));
        throw step1Error;
      }

      // 步骤2: 检测已标记集数并删除对应CSV行
      let csvProcessResult;
      try {
        console.log(`[TaskScheduler] 步骤2: 处理已标记集数`);
        console.log(`[TaskScheduler] 使用CSV文件: ${extractResult.csvPath}`);
        await taskExecutionLogger.startStep(task.id, '步骤2');
        await taskExecutionLogger.addLog(task.id, '步骤2', '开始处理已标记集数', 'info');
        await taskExecutionLogger.updateProgress(task.id, 40);

        console.log(`[TaskScheduler] 步骤2: 调用processCSVWithMarkedEpisodes，参数: csvPath=${extractResult.csvPath}, item=${currentItem.title}, season=${task.action.seasonNumber}`);
        csvProcessResult = await this.processCSVWithMarkedEpisodes(
          extractResult.csvPath!,
          currentItem,
          task.action.seasonNumber,
          task
        );

        console.log(`[TaskScheduler] 步骤2: processCSVWithMarkedEpisodes返回结果:`, {
          success: csvProcessResult.success,
          processedCsvPath: csvProcessResult.processedCsvPath,
          removedEpisodes: csvProcessResult.removedEpisodes,
          error: csvProcessResult.error
        });

        if (!csvProcessResult.success) {
          await taskExecutionLogger.addLog(task.id, '步骤2', `CSV处理失败: ${csvProcessResult.error}`, 'error');
          throw new Error(`CSV处理失败: ${csvProcessResult.error}`);
        }

        await taskExecutionLogger.addLog(task.id, '步骤2', `CSV处理成功，删除了 ${csvProcessResult.removedEpisodes?.length || 0} 个已标记集数`, 'success');
        await taskExecutionLogger.updateProgress(task.id, 50);
        await taskExecutionLogger.completeStep(task.id, '步骤2', true);
        console.log(`[TaskScheduler] 步骤2: CSV处理成功完成`);

      } catch (step2Error) {
        console.error(`[TaskScheduler] 步骤2执行过程中发生错误:`, step2Error);
        await taskExecutionLogger.addLog(task.id, '步骤2', `执行过程中发生错误: ${step2Error instanceof Error ? step2Error.message : String(step2Error)}`, 'error');
        await taskExecutionLogger.completeStep(task.id, '步骤2', false, step2Error instanceof Error ? step2Error.message : String(step2Error));
        throw step2Error;
      }

      // 步骤2.5: 检查CSV中是否还有包含词条标题的行（在TMDB导入前，仅在启用词条标题清理时）
      let hasItemTitleInCSV = false;
      try {
        if (task.action.enableTitleCleaning !== false) {
          console.log(`[TaskScheduler] 步骤2.5: 检查CSV中的词条标题状态`);
          await taskExecutionLogger.startStep(task.id, '步骤2.5');
          await taskExecutionLogger.addLog(task.id, '步骤2.5', '检查CSV中的词条标题状态', 'info');

          console.log(`[TaskScheduler] 步骤2.5: 调用checkItemTitleInCSV，参数: csvPath=${csvProcessResult.processedCsvPath}, title=${currentItem.title}`);
          hasItemTitleInCSV = await this.checkItemTitleInCSV(csvProcessResult.processedCsvPath!, currentItem.title);
          console.log(`[TaskScheduler] 步骤2.5: checkItemTitleInCSV返回结果: ${hasItemTitleInCSV}`);

          if (hasItemTitleInCSV) {
            console.log(`[TaskScheduler] CSV中仍有包含词条标题"${currentItem.title}"的单元格，本次执行跳过自动标记`);
            console.log(`[TaskScheduler] 将继续执行TMDB导入，但不进行集数标记，等待下次执行时词条标题完全清理后再标记`);
            await taskExecutionLogger.addLog(task.id, '步骤2.5', 'CSV中仍有词条标题，将跳过自动标记', 'warning');
          } else {
            await taskExecutionLogger.addLog(task.id, '步骤2.5', 'CSV中无词条标题，可以进行自动标记', 'success');
          }
          await taskExecutionLogger.completeStep(task.id, '步骤2.5', true);
        } else {
          console.log(`[TaskScheduler] 步骤2.5: 用户已禁用词条标题清理功能，跳过检查`);
          await taskExecutionLogger.addLog(task.id, '步骤2.5', '用户已禁用词条标题清理功能，跳过检查', 'info');
          await taskExecutionLogger.completeStep(task.id, '步骤2.5', true);
        }

      } catch (step25Error) {
        console.error(`[TaskScheduler] 步骤2.5执行过程中发生错误:`, step25Error);
        await taskExecutionLogger.addLog(task.id, '步骤2.5', `执行过程中发生错误: ${step25Error instanceof Error ? step25Error.message : String(step25Error)}`, 'error');
        await taskExecutionLogger.completeStep(task.id, '步骤2.5', false, step25Error instanceof Error ? step25Error.message : String(step25Error));
        // 步骤2.5的错误不应该中断整个流程，设置默认值
        hasItemTitleInCSV = false;
        console.warn(`[TaskScheduler] 步骤2.5失败，但不中断整个流程，默认允许自动标记`);
      }

      // 步骤3: 执行TMDB导入
      console.log(`[TaskScheduler] 步骤3: 执行TMDB导入`);
      await taskExecutionLogger.startStep(task.id, '步骤3');
      await taskExecutionLogger.addLog(task.id, '步骤3', '开始TMDB导入', 'info');
      await taskExecutionLogger.updateProgress(task.id, 60);

      try {
        const conflictAction = task.action.conflictAction || 'w';
        console.log(`[TaskScheduler] 步骤3: 准备调用executeTMDBImport，参数: csvPath=${csvProcessResult.processedCsvPath}, item=${currentItem.title}, season=${task.action.seasonNumber}, conflictAction=${conflictAction}`);

        await taskExecutionLogger.addLog(task.id, '步骤3', `调用TMDB导入API，冲突处理: ${conflictAction}`, 'info');

        const importResult = await this.executeTMDBImport(
          csvProcessResult.processedCsvPath!,
          currentItem,
          task.action.seasonNumber,
          conflictAction,
          task
        );

        console.log(`[TaskScheduler] 步骤3: executeTMDBImport返回结果:`, importResult);

        if (!importResult.success) {
          await taskExecutionLogger.addLog(task.id, '步骤3', `TMDB导入失败: ${importResult.error}`, 'error');
          throw new Error(`TMDB导入失败: ${importResult.error}`);
        }

        await taskExecutionLogger.addLog(task.id, '步骤3', 'TMDB导入成功', 'success');
        await taskExecutionLogger.completeStep(task.id, '步骤3', true);
        console.log(`[TaskScheduler] 步骤3: TMDB导入成功完成`);

      } catch (step3Error) {
        console.error(`[TaskScheduler] 步骤3执行过程中发生错误:`, step3Error);
        await taskExecutionLogger.addLog(task.id, '步骤3', `执行过程中发生错误: ${step3Error instanceof Error ? step3Error.message : String(step3Error)}`, 'error');
        await taskExecutionLogger.completeStep(task.id, '步骤3', false, step3Error instanceof Error ? step3Error.message : String(step3Error));
        throw step3Error;
      }

      // 步骤4: 条件性集数标记（仅在没有词条标题时执行）
      if (!hasItemTitleInCSV) {
        try {
          console.log(`[TaskScheduler] 步骤4: 执行自动集数标记`);
          await taskExecutionLogger.startStep(task.id, '步骤4');
          await taskExecutionLogger.addLog(task.id, '步骤4', '开始自动集数标记', 'info');
          await taskExecutionLogger.updateProgress(task.id, 80);

          console.log(`[TaskScheduler] 步骤4: 分析CSV剩余集数`);
          const csvAnalysisResult = await this.analyzeCSVRemainingEpisodes(csvProcessResult.processedCsvPath!);
          console.log(`[TaskScheduler] 步骤4: CSV分析结果:`, csvAnalysisResult);

          if (csvAnalysisResult.success && csvAnalysisResult.remainingEpisodes && csvAnalysisResult.remainingEpisodes.length > 0) {
            console.log(`[TaskScheduler] CSV中剩余的集数（即成功导入的集数）: [${csvAnalysisResult.remainingEpisodes.join(', ')}]`);
            await taskExecutionLogger.addLog(task.id, '步骤4', `发现 ${csvAnalysisResult.remainingEpisodes.length} 个集数需要标记`, 'info');

            // 直接在调度器内部标记集数，不使用API
            console.log(`[TaskScheduler] 步骤4: 开始标记集数`);
            const markingResult = await this.markEpisodesDirectly(currentItem, task.action.seasonNumber, csvAnalysisResult.remainingEpisodes);
            console.log(`[TaskScheduler] 步骤4: 集数标记结果:`, markingResult);

            if (markingResult) {
              await taskExecutionLogger.addLog(task.id, '步骤4', `成功标记 ${csvAnalysisResult.remainingEpisodes.length} 个集数`, 'success');

              // 检查项目是否已完结，如果是且用户启用了自动删除则删除定时任务
              if (markingResult.projectCompleted && task.action.autoDeleteWhenCompleted !== false) {
                console.log(`[TaskScheduler] 项目 ${currentItem.title} 已完结，用户启用了自动删除，准备删除定时任务`);
                await taskExecutionLogger.addLog(task.id, '步骤4', '项目已完结，将删除定时任务', 'info');
                await this.deleteCompletedTask(task);
              } else if (markingResult.projectCompleted) {
                console.log(`[TaskScheduler] 项目 ${currentItem.title} 已完结，但用户未启用自动删除任务功能`);
                await taskExecutionLogger.addLog(task.id, '步骤4', '项目已完结，但未启用自动删除任务', 'info');
              }
            } else {
              await taskExecutionLogger.addLog(task.id, '步骤4', '集数标记失败', 'warning');
            }
          } else {
            console.log(`[TaskScheduler] CSV中没有剩余集数，无需标记`);
            await taskExecutionLogger.addLog(task.id, '步骤4', 'CSV中没有剩余集数，无需标记', 'info');
            if (!csvAnalysisResult.success) {
              console.warn(`[TaskScheduler] CSV分析失败: ${csvAnalysisResult.error}`);
              await taskExecutionLogger.addLog(task.id, '步骤4', `CSV分析失败: ${csvAnalysisResult.error}`, 'warning');
            }
          }

          await taskExecutionLogger.addLog(task.id, '步骤4', '自动集数标记完成', 'success');
          await taskExecutionLogger.completeStep(task.id, '步骤4', true);

        } catch (step4Error) {
          console.error(`[TaskScheduler] 步骤4执行过程中发生错误:`, step4Error);
          await taskExecutionLogger.addLog(task.id, '步骤4', `执行过程中发生错误: ${step4Error instanceof Error ? step4Error.message : String(step4Error)}`, 'error');
          await taskExecutionLogger.completeStep(task.id, '步骤4', false, step4Error instanceof Error ? step4Error.message : String(step4Error));
          // 步骤4的错误不应该中断整个流程，只记录警告
          console.warn(`[TaskScheduler] 步骤4失败，但不中断整个流程`);
        }
      } else {
        console.log(`[TaskScheduler] 步骤4: 跳过自动集数标记（CSV中仍有词条标题）`);
        await taskExecutionLogger.startStep(task.id, '步骤4');
        await taskExecutionLogger.addLog(task.id, '步骤4', '跳过自动集数标记（CSV中仍有词条标题）', 'info');
        await taskExecutionLogger.completeStep(task.id, '步骤4', true);
        console.log(`[TaskScheduler] 任务将继续运行，等待下次执行时词条标题完全清理后再进行标记`);
      }

      console.log(`[TaskScheduler] TMDB-Import工作流程完成: ${item.title}`);

    } catch (error) {
      console.error(`[TaskScheduler] TMDB-Import工作流程失败:`, error);
      throw error;
    }
  }

  /**
   * 步骤1: 执行播出平台抓取
   */
  private async executePlatformExtraction(item: TMDBItem, seasonNumber: number): Promise<{
    success: boolean;
    csvPath?: string;
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 执行播出平台抓取: ${item.platformUrl}`);
      console.log(`[TaskScheduler] 步骤1参数: seasonNumber=${seasonNumber}, itemId=${item.id}`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[TaskScheduler] 播出平台抓取API调用超时，正在中止请求`);
        controller.abort();
      }, 5 * 60 * 1000); // 5分钟超时

      try {
        console.log(`[TaskScheduler] 准备调用播出平台抓取API`);

        const response = await fetch('/api/execute-platform-extraction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformUrl: item.platformUrl,
            seasonNumber: seasonNumber,
            itemId: item.id
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`[TaskScheduler] 播出平台抓取API响应状态: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          console.error(`[TaskScheduler] 播出平台抓取API请求失败，状态码: ${response.status}`);
          let errorData;
          try {
            errorData = await response.json();
            console.error(`[TaskScheduler] 播出平台抓取API错误响应:`, errorData);
          } catch (parseError) {
            console.error(`[TaskScheduler] 无法解析播出平台抓取错误响应:`, parseError);
            errorData = {};
          }
          throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
        }

        console.log(`[TaskScheduler] 开始解析播出平台抓取API响应`);
        const result = await response.json();
        console.log(`[TaskScheduler] 播出平台抓取API响应结果:`, result);

        if (!result.success) {
          console.error(`[TaskScheduler] 播出平台抓取API返回失败结果:`, result.error);
          throw new Error(result.error || '播出平台抓取失败');
        }

        console.log(`[TaskScheduler] 播出平台抓取成功，CSV路径: ${result.csvPath}`);
        return {
          success: true,
          csvPath: result.csvPath
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error(`[TaskScheduler] 播出平台抓取失败:`, error);

      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: '播出平台抓取超时（5分钟），请检查网络连接或稍后重试'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 步骤2: 处理已标记集数的CSV
   */
  private async processCSVWithMarkedEpisodes(csvPath: string, item: TMDBItem, seasonNumber: number, task: ScheduledTask): Promise<{
    success: boolean;
    processedCsvPath?: string;
    removedEpisodes?: number[];
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 处理CSV文件中的已标记集数`);
      console.log(`[TaskScheduler] 使用项目: ${item.title} (ID: ${item.id})`);

      // 获取已标记的集数（使用传入的最新项目数据）
      const markedEpisodes = this.getMarkedEpisodes(item, seasonNumber);
      console.log(`[TaskScheduler] 已标记的集数: [${markedEpisodes.join(', ')}]`);

      if (markedEpisodes.length === 0) {
        console.log(`[TaskScheduler] 没有已标记的集数，跳过CSV处理`);
        return {
          success: true,
          processedCsvPath: csvPath,
          removedEpisodes: []
        };
      }

      // 使用API处理CSV（统一方式，避免客户端/服务端差异）
      console.log(`[TaskScheduler] 使用API处理CSV...`);

      // 执行实际的CSV处理
      console.log(`[TaskScheduler] 执行实际的CSV处理`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[TaskScheduler] CSV处理API调用超时，正在中止请求`);
        controller.abort();
      }, 2 * 60 * 1000); // 2分钟超时

      try {
        const response = await fetch('/api/process-csv-episodes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvPath: csvPath,
            markedEpisodes: markedEpisodes,
            platformUrl: item.platformUrl,
            itemId: item.id,
            itemTitle: item.title,
            testMode: false,
            enableYoukuSpecialHandling: task.action.enableYoukuSpecialHandling !== false,
            enableTitleCleaning: task.action.enableTitleCleaning !== false,
            removeAirDateColumn: task.action.removeAirDateColumn === true,
            removeRuntimeColumn: task.action.removeRuntimeColumn === true,
            removeBackdropColumn: task.action.removeBackdropColumn === true
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'CSV处理失败');
        }

        return {
          success: true,
          processedCsvPath: result.processedCsvPath,
          removedEpisodes: result.removedEpisodes
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error(`[TaskScheduler] CSV处理失败:`, error);

      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'CSV处理超时（2分钟），请检查网络连接或稍后重试'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取已标记的集数
   */
  private getMarkedEpisodes(item: TMDBItem, seasonNumber: number): number[] {
    const markedEpisodes: number[] = [];

    console.log(`[TaskScheduler] 获取已标记集数 - 项目: ${item.title}, 季数: ${seasonNumber}`);
    console.log(`[TaskScheduler] 项目数据结构:`, {
      hasSeasons: !!(item.seasons && item.seasons.length > 0),
      seasonsCount: item.seasons?.length || 0,
      hasEpisodes: !!(item.episodes && item.episodes.length > 0),
      episodesCount: item.episodes?.length || 0
    });

    if (item.seasons && item.seasons.length > 0) {
      // 多季模式
      console.log(`[TaskScheduler] 多季模式，查找第 ${seasonNumber} 季`);
      const targetSeason = item.seasons.find(s => s.seasonNumber === seasonNumber);

      if (targetSeason) {
        console.log(`[TaskScheduler] 找到目标季，集数数量: ${targetSeason.episodes?.length || 0}`);
        if (targetSeason.episodes) {
          targetSeason.episodes.forEach(episode => {
            console.log(`[TaskScheduler] 检查集数 ${episode.number}: completed=${episode.completed}`);
            if (episode.completed) {
              markedEpisodes.push(episode.number);
            }
          });
        }
      } else {
        console.warn(`[TaskScheduler] 未找到第 ${seasonNumber} 季，可用季数: ${item.seasons.map(s => s.seasonNumber).join(', ')}`);
      }
    } else if (item.episodes) {
      // 单季模式
      console.log(`[TaskScheduler] 单季模式，总集数: ${item.episodes.length}`);
      item.episodes.forEach(episode => {
        console.log(`[TaskScheduler] 检查集数 ${episode.number}: completed=${episode.completed}`);
        if (episode.completed) {
          markedEpisodes.push(episode.number);
        }
      });
    } else {
      console.warn(`[TaskScheduler] 项目没有集数信息`);
    }

    const sortedEpisodes = markedEpisodes.sort((a, b) => a - b);
    console.log(`[TaskScheduler] 最终已标记集数: [${sortedEpisodes.join(', ')}]`);
    return sortedEpisodes;
  }

  /**
   * 检查CSV文件中是否还有包含词条标题的行
   */
  private async checkItemTitleInCSV(csvPath: string, itemTitle: string): Promise<boolean> {
    try {
      console.log(`[TaskScheduler] 检查CSV中是否包含词条标题: "${itemTitle}"`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[TaskScheduler] 检查CSV标题API调用超时，正在中止请求`);
        controller.abort();
      }, 60 * 1000); // 1分钟超时

      try {
        const response = await fetch('/api/check-csv-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvPath: csvPath,
            itemTitle: itemTitle
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[TaskScheduler] 检查CSV标题失败: ${response.status}`);
          return false; // 检查失败时默认允许标记
        }

        const result = await response.json();
        console.log(`[TaskScheduler] CSV标题检查结果: ${result.hasItemTitle ? '包含' : '不包含'}词条标题`);

        return result.hasItemTitle || false;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.warn(`[TaskScheduler] 检查CSV标题异常: ${error}`);
      return false; // 异常时默认允许标记
    }
  }

  /**
   * 通过API分析CSV文件中剩余的集数（即成功导入的集数）
   */
  private async analyzeCSVRemainingEpisodes(csvPath: string): Promise<{
    success: boolean;
    remainingEpisodes?: number[];
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 通过API分析CSV文件剩余集数: ${csvPath}`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[TaskScheduler] 分析CSV集数API调用超时，正在中止请求`);
        controller.abort();
      }, 60 * 1000); // 1分钟超时

      try {
        const response = await fetch('/api/analyze-csv-episodes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvPath: csvPath
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'CSV分析失败');
        }

        console.log(`[TaskScheduler] CSV分析成功，剩余集数: [${result.remainingEpisodes?.join(', ') || ''}]`);

        return {
          success: true,
          remainingEpisodes: result.remainingEpisodes || []
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error(`[TaskScheduler] CSV分析失败:`, error);

      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'CSV分析超时（1分钟），请检查网络连接或稍后重试'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }





  /**
   * 步骤3: 执行TMDB导入
   */
  private async executeTMDBImport(csvPath: string, item: TMDBItem, seasonNumber: number, conflictAction: 'w' | 'y' | 'n' = 'w', task?: ScheduledTask): Promise<{
    success: boolean;
    importedEpisodes?: number[];
    error?: string;
  }> {
    try {
      console.log(`[TaskScheduler] 开始执行TMDB导入`);
      console.log(`[TaskScheduler] 参数详情: csvPath=${csvPath}, itemId=${item.id}, itemTitle=${item.title}, tmdbId=${item.tmdbId}, seasonNumber=${seasonNumber}, conflictAction=${conflictAction}`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutDuration = 15 * 60 * 1000; // 15分钟超时
      const timeoutId = setTimeout(() => {
        console.log(`[TaskScheduler] TMDB导入API调用超时 (${timeoutDuration/60000}分钟)，正在中止请求`);
        controller.abort();
      }, timeoutDuration);

      try {
        console.log(`[TaskScheduler] 准备调用TMDB导入API: /api/execute-tmdb-import`);

        const requestBody = {
          csvPath: csvPath,
          seasonNumber: seasonNumber,
          itemId: item.id,
          tmdbId: item.tmdbId,
          conflictAction: conflictAction,
          // 添加三个高级选项
          removeAirDateColumn: task?.action.removeAirDateColumn === true,
          removeRuntimeColumn: task?.action.removeRuntimeColumn === true,
          removeBackdropColumn: task?.action.removeBackdropColumn === true
        };

        console.log(`[TaskScheduler] API请求体:`, requestBody);

        // 验证请求体
        if (!requestBody.csvPath) {
          throw new Error('CSV路径为空');
        }
        if (!requestBody.tmdbId) {
          throw new Error('TMDB ID为空');
        }
        if (!requestBody.seasonNumber) {
          throw new Error('季数为空');
        }

        const response = await fetch('/api/execute-tmdb-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`[TaskScheduler] API响应状态: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          console.error(`[TaskScheduler] API请求失败，状态码: ${response.status}`);
          let errorData;
          try {
            errorData = await response.json();
            console.error(`[TaskScheduler] API错误响应:`, errorData);
          } catch (parseError) {
            console.error(`[TaskScheduler] 无法解析错误响应:`, parseError);
            errorData = {};
          }

          // 返回失败结果而不是抛出错误
          return {
            success: false,
            error: `API请求失败 (${response.status}): ${errorData.error || response.statusText}`
          };
        }

        console.log(`[TaskScheduler] 开始解析API响应`);
        let result;
        try {
          const responseText = await response.text();
          console.log(`[TaskScheduler] API响应原始文本长度:`, responseText.length);
          console.log(`[TaskScheduler] API响应原始文本前500字符:`, responseText.substring(0, 500));

          if (!responseText.trim()) {
            return {
              success: false,
              error: 'API返回空响应'
            };
          }

          result = JSON.parse(responseText);
          console.log(`[TaskScheduler] API响应解析成功，结果类型:`, typeof result);
          console.log(`[TaskScheduler] API响应结果:`, result);
        } catch (parseError) {
          console.error(`[TaskScheduler] 解析API响应失败:`, parseError);
          console.error(`[TaskScheduler] 响应状态:`, response.status, response.statusText);
          console.error(`[TaskScheduler] 响应头:`, Object.fromEntries(response.headers.entries()));
          return {
            success: false,
            error: `API响应解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          };
        }

        if (!result.success) {
          console.error(`[TaskScheduler] API返回失败结果:`, result.error);
          return {
            success: false,
            error: result.error || 'TMDB导入失败'
          };
        }

        console.log(`[TaskScheduler] TMDB导入API调用成功`);
        return {
          success: true,
          importedEpisodes: result.importedEpisodes || []
        };

      } catch (fetchError) {
        clearTimeout(timeoutId);
        return this.handleTMDBImportError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
      }

    } catch (error) {
      console.error(`[TaskScheduler] TMDB导入失败:`, error);
      return this.handleTMDBImportError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 处理TMDB导入错误
   */
  private handleTMDBImportError(error: Error): { success: false; error: string } {
    console.log(`[TaskScheduler] 处理错误: ${error.message}`);

    // 简化错误处理，直接返回错误信息，不抛出异常
    let errorMessage = error.message;

    // 对常见错误提供友好提示
    if (error.name === 'AbortError') {
      errorMessage = 'TMDB导入超时，任务已停止';
    } else if (error.message.includes('500')) {
      errorMessage = '服务器暂时不可用，任务已停止';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '网络连接问题，任务已停止';
    }

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * 直接在调度器内部标记集数为已完成，不使用API
   */
  private async markEpisodesDirectly(item: TMDBItem, seasonNumber: number, episodeNumbers: number[]): Promise<{
    success: boolean;
    markedCount: number;
    projectCompleted: boolean;
  } | null> {
    try {
      console.log(`[TaskScheduler] 直接标记集数为已完成: 项目="${item.title}", 季=${seasonNumber}, 集数=[${episodeNumbers.join(', ')}]`);

      // 获取最新的项目数据
      const allItems = await StorageManager.getItemsWithRetry();
      let targetItem = allItems.find(i => i.id === item.id);

      if (!targetItem) {
        // 尝试通过标题查找
        targetItem = allItems.find(i => i.title === item.title);
        if (targetItem) {
          console.log(`[TaskScheduler] 通过标题找到项目: ${targetItem.title} (ID: ${targetItem.id})`);
        } else {
          console.error(`[TaskScheduler] 无法找到项目: ID=${item.id}, 标题=${item.title}`);
          return;
        }
      }

      // 创建项目副本以避免直接修改
      const updatedItem = JSON.parse(JSON.stringify(targetItem));
      let markedCount = 0;
      const markedEpisodes: number[] = [];

      if (updatedItem.seasons && updatedItem.seasons.length > 0) {
        // 多季模式
        console.log(`[TaskScheduler] 多季模式，查找第 ${seasonNumber} 季`);
        const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);

        if (!targetSeason) {
          console.error(`[TaskScheduler] 找不到第 ${seasonNumber} 季`);
          return;
        }

        if (!targetSeason.episodes) {
          targetSeason.episodes = [];
        }

        // 标记指定集数为已完成
        episodeNumbers.forEach(episodeNum => {
          let episode = targetSeason.episodes!.find(e => e.number === episodeNum);

          if (!episode) {
            // 如果集数不存在，创建新的集数记录
            episode = {
              number: episodeNum,
              completed: false,
              seasonNumber: seasonNumber
            };
            targetSeason.episodes!.push(episode);
            console.log(`[TaskScheduler] 创建新集数记录: 第${seasonNumber}季第${episodeNum}集`);
          }

          if (!episode.completed) {
            episode.completed = true;
            markedCount++;
            markedEpisodes.push(episodeNum);
            console.log(`[TaskScheduler] ✓ 标记第 ${seasonNumber} 季第 ${episodeNum} 集为已完成`);
          } else {
            console.log(`[TaskScheduler] - 第 ${seasonNumber} 季第 ${episodeNum} 集已经标记为完成`);
          }
        });

        // 按集数排序
        targetSeason.episodes.sort((a, b) => a.number - b.number);

      } else if (updatedItem.episodes) {
        // 单季模式
        console.log(`[TaskScheduler] 单季模式，当前集数: ${updatedItem.episodes.length}`);

        episodeNumbers.forEach(episodeNum => {
          let episode = updatedItem.episodes!.find(e => e.number === episodeNum);

          if (!episode) {
            // 如果集数不存在，创建新的集数记录
            episode = {
              number: episodeNum,
              completed: false
            };
            updatedItem.episodes!.push(episode);
            console.log(`[TaskScheduler] 创建新集数记录: 第${episodeNum}集`);
          }

          if (!episode.completed) {
            episode.completed = true;
            markedCount++;
            markedEpisodes.push(episodeNum);
            console.log(`[TaskScheduler] ✓ 标记第 ${episodeNum} 集为已完成`);
          } else {
            console.log(`[TaskScheduler] - 第 ${episodeNum} 集已经标记为完成`);
          }
        });

        // 按集数排序
        updatedItem.episodes.sort((a, b) => a.number - b.number);

      } else {
        console.error(`[TaskScheduler] 项目没有集数信息`);
        return;
      }

      // 检查是否所有集数都已完成，更新项目状态
      let allCompleted = false;
      if (updatedItem.seasons && updatedItem.seasons.length > 0) {
        // 多季模式：检查所有季的所有集数
        allCompleted = updatedItem.seasons.every(season =>
          season.episodes && season.episodes.length > 0 &&
          season.episodes.every(ep => ep.completed)
        );
      } else if (updatedItem.episodes) {
        // 单季模式：检查所有集数
        allCompleted = updatedItem.episodes.length > 0 &&
          updatedItem.episodes.every(ep => ep.completed);
      }

      if (allCompleted && updatedItem.status === "ongoing") {
        updatedItem.status = "completed";
        updatedItem.completed = true;
        console.log(`[TaskScheduler] 项目 ${updatedItem.title} 所有集数已完成，更新状态为已完成`);
      }

      // 更新时间戳
      updatedItem.updatedAt = new Date().toISOString();

      // 保存更新后的项目
      console.log(`[TaskScheduler] 保存更新后的项目数据...`);
      const updateSuccess = await StorageManager.updateItem(updatedItem);

      if (updateSuccess) {
        console.log(`[TaskScheduler] ✓ 成功标记 ${markedCount} 个集数为已完成`);
        console.log(`[TaskScheduler] 新标记的集数: [${markedEpisodes.join(', ')}]`);
        console.log(`[TaskScheduler] 项目完成状态: ${allCompleted ? '已完结' : '进行中'}`);

        // 通知实时同步管理器数据已更新，让主页面能够感知变化
        try {
          const { realtimeSyncManager } = await import('@/lib/realtime-sync-manager');
            await realtimeSyncManager.notifyDataChange({
                type: 'episode_updated',
                data: updatedItem,
                source: 'scheduled_task'
              });
          console.log(`[TaskScheduler] ✓ 已通知实时同步管理器数据更新`);
        } catch (syncError) {
          console.warn(`[TaskScheduler] 通知实时同步失败，但不影响任务执行:`, syncError);
        }

        return {
          success: true,
          markedCount: markedCount,
          projectCompleted: allCompleted
        };
      } else {
        console.error(`[TaskScheduler] 保存项目更新失败`);
        return {
          success: false,
          markedCount: 0,
          projectCompleted: false
        };
      }

    } catch (error) {
      console.error(`[TaskScheduler] 直接标记集数失败:`, error);
      return null;
    }
  }

  /**
   * 删除已完结项目的定时任务
   */
  private async deleteCompletedTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`[TaskScheduler] 删除已完结项目的定时任务: ${task.name} (ID: ${task.id})`);

      // 先取消任务调度
      if (task.enabled) {
        await this.cancelTask(task.id);
        console.log(`[TaskScheduler] 已取消任务调度: ${task.id}`);
      }

      // 从存储中删除任务
      const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);

      if (deleteSuccess) {
        console.log(`[TaskScheduler] ✓ 成功删除已完结项目的定时任务: ${task.name}`);

        // 强制刷新任务列表
        await StorageManager.forceRefreshScheduledTasks();

        // 通知实时同步管理器任务已完成并删除
        try {
          const { realtimeSyncManager } = await import('@/lib/realtime-sync-manager');
          await realtimeSyncManager.notifyDataChange({
            type: 'task_completed',
            data: { 
              taskId: task.id, 
              itemId: task.itemId,
              itemTitle: task.itemTitle,
              deleted: true 
            },
            source: 'scheduled_task'
          });
          console.log(`[TaskScheduler] ✓ 已通知实时同步管理器任务完成并删除`);
        } catch (syncError) {
          console.warn(`[TaskScheduler] 通知实时同步失败，但不影响任务删除:`, syncError);
        }

        console.log(`[TaskScheduler] 项目 ${task.itemTitle} 已完结，相关定时任务已自动删除`);
      } else {
        console.error(`[TaskScheduler] 删除定时任务失败: ${task.id}`);
      }

    } catch (error) {
      console.error(`[TaskScheduler] 删除已完结任务异常:`, error);
    }
  }

  /**
   * 步骤4: 自动标记CSV剩余集数为已完成（即成功导入的集数）- API版本（备用）
   */
  private async markEpisodesAsCompleted(item: TMDBItem, seasonNumber: number, episodeNumbers: number[]): Promise<void> {
    try {
      console.log(`[TaskScheduler] 自动标记CSV剩余集数为已完成: 季=${seasonNumber}, 集数=[${episodeNumbers.join(', ')}]`);
      console.log(`[TaskScheduler] 这些集数是CSV中剩余的，表示已成功导入到TMDB`);
      console.log(`[TaskScheduler] 使用项目ID: ${item.id}, 项目标题: ${item.title}`);

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`[TaskScheduler] 标记集数完成API调用超时，正在中止请求`);
        controller.abort();
      }, 30 * 1000); // 30秒超时

      try {
        const response = await fetch('/api/mark-episodes-completed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemId: item.id,
            seasonNumber: seasonNumber,
            episodeNumbers: episodeNumbers
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API请求失败 (${response.status}): ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || '标记集数失败');
        }

        console.log(`[TaskScheduler] 成功标记 ${episodeNumbers.length} 个集数为已完成`);

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      console.error(`[TaskScheduler] 标记集数失败:`, error);

      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[TaskScheduler] 标记集数超时（30秒），但任务继续执行`);
      } else {
        console.warn(`[TaskScheduler] 标记集数失败，但任务继续执行: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * 检查并处理已完结项目的任务自动删除
   */
  private async checkAndHandleCompletedProject(task: ScheduledTask, relatedItem: TMDBItem): Promise<boolean> {
    try {
      // 检查任务是否启用了自动删除选项
      if (!task.action.autoDeleteWhenCompleted) {
        console.log(`[TaskScheduler] 任务 ${task.name} 未启用自动删除选项，跳过检查`);
        return false;
      }

      // 检查项目是否已完结
      const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;

      if (!isCompleted) {
        console.log(`[TaskScheduler] 项目 ${relatedItem.title} 尚未完结，继续执行任务`);
        return false;
      }

      console.log(`[TaskScheduler] 检测到项目 ${relatedItem.title} 已完结，且任务 ${task.name} 启用了自动删除选项`);

      // 记录删除日志
      await taskExecutionLogger.addLog(task.id, '自动删除', `项目已完结，自动删除定时任务`, 'info');

      // 清除定时器和验证定时器
      if (this.timers.has(task.id)) {
        clearTimeout(this.timers.get(task.id));
        this.timers.delete(task.id);
        console.log(`[TaskScheduler] 清除任务 ${task.id} 的定时器`);
      }
      if (this.timerValidations.has(task.id)) {
        clearTimeout(this.timerValidations.get(task.id));
        this.timerValidations.delete(task.id);
        console.log(`[TaskScheduler] 清除任务 ${task.id} 的定时器验证`);
      }

      // 从存储中删除任务
      const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);

      if (deleteSuccess) {
        console.log(`[TaskScheduler] ✓ 成功自动删除已完结项目的定时任务: ${task.name}`);

        // 记录最终删除日志
        await taskExecutionLogger.addLog(task.id, '删除完成', `定时任务已自动删除`, 'success');

        return true; // 返回true表示任务已被删除
      } else {
        console.error(`[TaskScheduler] ✗ 自动删除定时任务失败: ${task.name}`);
        await taskExecutionLogger.addLog(task.id, '删除失败', `自动删除定时任务失败`, 'error');
        return false;
      }

    } catch (error) {
      console.error(`[TaskScheduler] 检查并处理已完结项目时出错:`, error);
      await taskExecutionLogger.addLog(task.id, '检查错误', `检查项目完结状态时出错: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return false;
    }
  }

  /**
   * 添加任务
   */
  public async addTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 确保任务有ID
      if (!task.id) {
        console.error('[TaskScheduler] 添加任务失败: 任务缺少ID');
        return false;
      }
      
      // 添加任务到存储
      const success = await StorageManager.addScheduledTask(task);
      
      if (success && task.enabled) {
        // 如果任务已启用，为其设置定时器
        this.scheduleTask(task);
      }
      
      return success;
    } catch (error) {
      console.error('[TaskScheduler] 添加任务失败:', error);
      return false;
    }
  }

  /**
   * 更新任务
   */
  public async updateTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 确保任务有ID
      if (!task.id) {
        console.error('[TaskScheduler] 更新任务失败: 任务缺少ID');
        return false;
      }
      
      // 获取原始任务状态
      const tasks = await StorageManager.getScheduledTasks();
      const originalTask = tasks.find(t => t.id === task.id);
      const wasEnabled = originalTask?.enabled ?? false;
      
      // 更新任务
      const success = await StorageManager.updateScheduledTask(task);
      
      if (success) {
        // 如果任务状态从禁用变为启用，或者任务保持启用状态但调度信息更改
        if (task.enabled && (!wasEnabled || 
            (originalTask && (
              originalTask.schedule.type !== task.schedule.type ||
              originalTask.schedule.hour !== task.schedule.hour ||
              originalTask.schedule.minute !== task.schedule.minute ||
              (task.schedule.type === 'weekly' && originalTask.schedule.dayOfWeek !== task.schedule.dayOfWeek)
            ))
          )) {
          // 重新调度任务
          this.scheduleTask(task);
        } 
        // 如果任务从启用变为禁用，清除定时器
        else if (!task.enabled && wasEnabled) {
          if (this.timers.has(task.id)) {
            clearTimeout(this.timers.get(task.id));
            this.timers.delete(task.id);
            console.log(`[TaskScheduler] 任务 ${task.id} 已禁用，清除定时器`);
          }
          if (this.timerValidations.has(task.id)) {
            clearTimeout(this.timerValidations.get(task.id));
            this.timerValidations.delete(task.id);
            console.log(`[TaskScheduler] 任务 ${task.id} 已禁用，清除定时器验证`);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('[TaskScheduler] 更新任务失败:', error);
      return false;
    }
  }

  /**
   * 取消任务调度（只清除定时器，不删除任务）
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    try {
      // 清除定时器
      if (this.timers.has(taskId)) {
        clearTimeout(this.timers.get(taskId));
        this.timers.delete(taskId);
        console.log(`[TaskScheduler] 已取消任务调度: ${taskId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TaskScheduler] 取消任务调度失败:', error);
      return false;
    }
  }

  /**
   * 删除任务
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      // 清除定时器和验证定时器
      if (this.timers.has(taskId)) {
        clearTimeout(this.timers.get(taskId));
        this.timers.delete(taskId);
        console.log(`[TaskScheduler] 清除任务 ${taskId} 的定时器`);
      }
      if (this.timerValidations.has(taskId)) {
        clearTimeout(this.timerValidations.get(taskId));
        this.timerValidations.delete(taskId);
        console.log(`[TaskScheduler] 清除任务 ${taskId} 的定时器验证`);
      }

      // 从存储中删除任务
      return await StorageManager.deleteScheduledTask(taskId);
    } catch (error) {
      console.error('[TaskScheduler] 删除任务失败:', error);
      return false;
    }
  }
  
  /**
   * 清理所有无效任务
   */
  public async cleanInvalidTasks(): Promise<{ success: boolean; message: string; cleanedCount: number; }> {
    try {
      // 获取所有任务和项目
      const tasks = await StorageManager.getScheduledTasks();
      const items = await StorageManager.getItemsWithRetry();
      
      // 找出无效任务（没有对应项目的任务）
      const invalidTasks = tasks.filter(task => {
        // 检查是否有对应的项目
        const hasValidItem = items.some(item => item.id === task.itemId);
        return !hasValidItem;
      });
      
      if (invalidTasks.length === 0) {
        return {
          success: true,
          message: "没有发现无效任务",
          cleanedCount: 0
        };
      }
      
      console.log(`[TaskScheduler] 发现 ${invalidTasks.length} 个无效任务，准备清理`);
      
      // 尝试修复任务
      const fixedTasks = await StorageManager.forceRefreshScheduledTasks();
      
      // 再次检查哪些任务仍然无效
      const stillInvalidTasks = fixedTasks.filter(task => {
        return !items.some(item => item.id === task.itemId);
      });
      
      if (stillInvalidTasks.length === 0) {
        return {
          success: true,
          message: `成功修复了 ${invalidTasks.length} 个无效任务`,
          cleanedCount: invalidTasks.length
        };
      }
      
      // 删除仍然无效的任务
      let deleteCount = 0;
      for (const task of stillInvalidTasks) {
        // 清除定时器
        if (this.timers.has(task.id)) {
          clearTimeout(this.timers.get(task.id));
          this.timers.delete(task.id);
        }
        
        // 从存储中删除任务
        const deleted = await StorageManager.deleteScheduledTask(task.id);
        if (deleted) {
          deleteCount++;
        }
      }
      
      const fixedCount = invalidTasks.length - stillInvalidTasks.length;
      
      return {
        success: true,
        message: `清理了 ${invalidTasks.length} 个无效任务: ${fixedCount} 个已修复, ${deleteCount} 个已删除`,
        cleanedCount: fixedCount + deleteCount
      };
    } catch (error) {
      console.error('[TaskScheduler] 清理无效任务失败:', error);
      return {
        success: false,
        message: `清理失败: ${error instanceof Error ? error.message : String(error)}`,
        cleanedCount: 0
      };
    }
  }

  /**
   * 立即执行任务
   */
  public async runTaskNow(taskId: string): Promise<{ success: boolean; message: string; }> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `找不到ID为 ${taskId} 的任务`
        };
      }

      // 如果任务已在执行中，返回提示
      if (this.currentExecution.has(taskId)) {
        return {
          success: false,
          message: `任务 ${task.name} 已在执行中`
        };
      }

      console.log(`[TaskScheduler] 手动执行任务: ${task.id} - ${task.name}`);

      // 执行任务
      await this._executeTaskInternal(task);

      return {
        success: true,
        message: `任务 ${task.name} 执行完成`
      };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[TaskScheduler] 手动执行任务失败:`, error);

      return {
        success: false,
        message: `执行失败: ${error instanceof Error ? error.message : String(error)}`
      };
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
      details: string[]
    }
  }> {
    try {
      console.log(`[TaskScheduler] 开始验证和修复任务关联`);

      const result = await StorageManager.validateAndFixTaskAssociations();

      // 如果有任务被修复或删除，重新初始化调度器
      if (result.fixedTasks > 0 || result.deletedTasks > 0) {
        console.log(`[TaskScheduler] 任务关联已更新，重新初始化调度器`);
        this.isInitialized = false;
        await this.initialize();
      }

      const message = result.invalidTasks === 0
        ? `所有 ${result.totalTasks} 个任务的关联都是有效的`
        : `处理了 ${result.invalidTasks} 个无效任务: ${result.fixedTasks} 个已修复, ${result.deletedTasks} 个已删除`;

      return {
        success: true,
        message,
        details: result
      };
    } catch (error) {
      console.error(`[TaskScheduler] 验证任务关联失败:`, error);
      return {
        success: false,
        message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          totalTasks: 0,
          invalidTasks: 0,
          fixedTasks: 0,
          deletedTasks: 0,
          details: []
        }
      };
    }
  }

  /**
   * 获取冲突检测统计信息
   */
  public getConflictStats() {
    return {
      detector: this.conflictDetector.getConflictStats(),
      resolver: this.conflictResolver.getResolutionStats()
    };
  }

  /**
   * 更新冲突检测和解决配置
   */
  public updateConflictConfig(config: any): void {
    const advancedConfig = advancedConfigManager.getConfig();

    if (config.conflictDetection) {
      this.conflictDetector.updateConfig(config.conflictDetection);
      advancedConfigManager.updateConfig({ conflictDetection: config.conflictDetection });
    }

    if (config.conflictResolution) {
      this.conflictResolver.updateConfig(config.conflictResolution);
      advancedConfigManager.updateConfig({ conflictResolution: config.conflictResolution });
    }

    console.log('[TaskScheduler] 冲突处理配置已更新');
  }

  /**
   * 清理过期的冲突检测数据
   */
  public cleanupConflictData(): void {
    this.conflictDetector.cleanupExpiredTasks();
    this.conflictResolver.clearResolutionHistory();
    console.log('[TaskScheduler] 冲突数据已清理');
  }
}

// 创建全局调度器实例
export const taskScheduler = TaskScheduler.getInstance();

// 导出类型，方便其他模块使用
export type { ScheduledTask, TMDBItem }; 