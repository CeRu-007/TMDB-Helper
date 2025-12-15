import { ScheduledTask } from '../storage';

/**
 * TimerManager - Handles all timer-related operations for the TaskScheduler
 * This class is responsible for:
 * - Scheduling and managing task timers
 * - Timer validation and verification
 * - Calculating next run times
 * - Managing timer-related data structures
 */
export class TimerManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private timerValidations: Map<string, NodeJS.Timeout> = new Map(); // Individual timer validations

  /**
   * Schedule a task with timer
   */
  public scheduleTask(
    task: ScheduledTask,
    executeCallback: (task: ScheduledTask) => Promise<void>,
  ): void {
    if (!task.enabled) {
      console.log(
        `[TimerManager] 任务 ${task.id} (${task.name}) 已禁用，不设置定时器`,
      );
      return;
    }

    // Clear existing timer if exists
    if (this.timers.has(task.id)) {
      clearTimeout(this.timers.get(task.id)!);
      this.timers.delete(task.id);
    }

    // Calculate next run time
    const nextRunTime = this.calculateNextRunTime(task);
    const delay = nextRunTime.getTime() - Date.now();

    // If delay is negative or too small, set minimum delay (10 seconds)
    const adjustedDelay = delay < 10000 ? 10000 : delay;

    // Update task's next run time
    this.updateTaskNextRunTime(task.id, nextRunTime.toISOString());

    // Set timer - no browser environment restrictions, ensure background execution
    const timer = setTimeout(async () => {
      console.log(
        `[TimerManager] 定时器触发: ${task.id} (${task.name}) 在 ${new Date().toLocaleString('zh-CN')}`,
      );
      await executeCallback(task);
    }, adjustedDelay);

    // Save timer reference
    this.timers.set(task.id, timer);

    // Format next run time as local time string
    const nextRunLocale = nextRunTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    console.log(
      `[TimerManager] 已为任务 ${task.id} 设置定时器，将在 ${nextRunLocale} 执行 (延迟 ${Math.round(adjustedDelay / 1000 / 60)} 分钟)`,
    );

    // Set timer validation mechanism - check every 5 minutes if timer still exists
    this.scheduleTimerValidation(task.id, adjustedDelay, executeCallback);
  }

  /**
   * Calculate next run time for a task
   */
  public calculateNextRunTime(task: ScheduledTask): Date {
    const now = new Date();

    // If it's weekly execution
    if (
      task.schedule.type === 'weekly' &&
      task.schedule.dayOfWeek !== undefined
    ) {
      return this.calculateNextWeeklyRunTime(task, now);
    } else {
      // Daily execution
      const nextRun = new Date();
      nextRun.setHours(task.schedule.hour);
      nextRun.setMinutes(task.schedule.minute);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // If today's time has passed, set to tomorrow
      if (now >= nextRun) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      // Ensure time is not set to the past
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      console.log(
        `[TimerManager] 计算每日任务下次执行时间: ${task.name} -> ${nextRun.toLocaleString('zh-CN')} (当前时间: ${now.toLocaleString('zh-CN')})`,
      );
      return nextRun;
    }
  }

  /**
   * Calculate next run time for weekly tasks (supporting dual broadcast days)
   */
  private calculateNextWeeklyRunTime(task: ScheduledTask, now: Date): Date {
    const targetDays: number[] = [task.schedule.dayOfWeek!];

    // If there's a second broadcast day, add it to the target days list
    if (task.schedule.secondDayOfWeek !== undefined) {
      targetDays.push(task.schedule.secondDayOfWeek);
    }

    // Get current day of week (0-6, 0 is Sunday)
    const currentDay = now.getDay();
    // Adjust to our convention (0-6, 0 is Monday)
    const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;

    let nearestNextRun: Date | null = null;
    let minDaysUntilTarget = Infinity;

    // Calculate next run time for each target day
    for (const targetDay of targetDays) {
      const nextRun = new Date(now);
      nextRun.setHours(task.schedule.hour);
      nextRun.setMinutes(task.schedule.minute);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);

      // Calculate days difference to target day
      let daysUntilTarget = targetDay - adjustedCurrentDay;
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7; // If it's a past date, add a week
      } else if (daysUntilTarget === 0 && now >= nextRun) {
        daysUntilTarget = 7; // If it's today but time has passed, set to next week
      }

      // Set to correct date
      nextRun.setDate(now.getDate() + daysUntilTarget);

      // Ensure time is not set to the past
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
        daysUntilTarget += 7;
      }

      // Choose the nearest execution time
      if (daysUntilTarget < minDaysUntilTarget) {
        minDaysUntilTarget = daysUntilTarget;
        nearestNextRun = nextRun;
      }
    }

    const result =
      nearestNextRun || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    console.log(
      `[TimerManager] 计算每周任务下次执行时间: ${task.name} -> ${result.toLocaleString('zh-CN')} (当前时间: ${now.toLocaleString('zh-CN')}, 目标星期: ${targetDays.join(',')})`,
    );
    return result;
  }

  /**
   * Schedule single timer validation mechanism
   */
  private scheduleTimerValidation(
    taskId: string,
    originalDelay: number,
    executeCallback: (task: ScheduledTask) => Promise<void>,
  ): void {
    // Clear existing validation timer
    if (this.timerValidations.has(taskId)) {
      clearTimeout(this.timerValidations.get(taskId));
      this.timerValidations.delete(taskId);
    }

    // Set validation interval: half of original delay, but no less than 5 minutes, no more than 30 minutes
    const validationInterval = Math.max(
      5 * 60 * 1000,
      Math.min(originalDelay / 2, 30 * 60 * 1000),
    );

    const validationTimer = setTimeout(async () => {
      await this.validateSingleTimer(taskId, executeCallback);
    }, validationInterval);

    this.timerValidations.set(taskId, validationTimer);
    console.log(
      `[TimerManager] 为任务 ${taskId} 设置定时器验证，${Math.round(validationInterval / 60000)} 分钟后检查`,
    );
  }

  /**
   * Validate if a single timer is still valid
   */
  private async validateSingleTimer(
    taskId: string,
    executeCallback: (task: ScheduledTask) => Promise<void>,
  ): Promise<void> {
    try {
      // Check if timer still exists
      if (!this.timers.has(taskId)) {
        console.warn(
          `[TimerManager] 定时器异常: 任务 ${taskId} 的定时器已丢失`,
        );
        // Re-schedule the task if needed
        // This would require getting the task from storage again
      } else {
        // Timer exists, continue with next validation
        const validationInterval = 30 * 60 * 1000; // 30 minutes
        this.scheduleTimerValidation(
          taskId,
          validationInterval,
          executeCallback,
        );
      }
    } catch (error) {
      console.error(`[TimerManager] 验证定时器时出错 (${taskId}):`, error);
    }
  }

  /**
   * Update task's next run time
   */
  private async updateTaskNextRunTime(
    taskId: string,
    nextRunTime: string,
  ): Promise<void> {
    // This would need to be implemented with access to storage
    // For now, we'll just log the update
    console.log(
      `[TimerManager] 更新任务 ${taskId} 的下次执行时间到: ${nextRunTime}`,
    );
  }

  /**
   * Clear all timers
   */
  public clearAllTimers(): void {
    this.timers.forEach((timer, id) => {
      clearTimeout(timer);
    });
    this.timers.clear();

    // Clear all timer validations
    this.timerValidations.forEach((timer, id) => {
      clearTimeout(timer);
    });
    this.timerValidations.clear();
  }

  /**
   * Cancel a specific task timer
   */
  public cancelTask(taskId: string): boolean {
    if (this.timers.has(taskId)) {
      clearTimeout(this.timers.get(taskId)!);
      this.timers.delete(taskId);

      // Also clear validation timer
      if (this.timerValidations.has(taskId)) {
        clearTimeout(this.timerValidations.get(taskId)!);
        this.timerValidations.delete(taskId);
      }

      return true;
    }
    return false;
  }

  /**
   * Check if task is running
   */
  public isTaskRunning(taskId: string): boolean {
    // This would be implemented in the main TaskScheduler
    // For now just return false
    return false;
  }
}
