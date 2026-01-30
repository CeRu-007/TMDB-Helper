/**
 * TaskLifecycle
 * 负责任务的增删改查和执行触发
 */

import { ScheduledTask } from '../storage';
import { TaskManager } from './task-manager';
import { TaskExecutor } from './task-executor';
import { TimerManager } from './timer-manager';
import { logger } from '@/lib/utils/logger';

/**
 * 任务生命周期管理器
 * 管理任务的增删改查和执行触发
 */
export class TaskLifecycle {
  constructor(
    private taskManager: TaskManager,
    private taskExecutor: TaskExecutor,
    private timerManager: TimerManager,
  ) {}

  /**
   * 添加任务
   */
  public async addTask(task: ScheduledTask): Promise<boolean> {
    try {
      // 确保任务有ID
      if (!task.id) {
        logger.error('TaskLifecycle', '添加任务失败：任务缺少ID');
        return false;
      }

      // 添加任务到存储
      const success = await this.taskManager.addTask(task);

      if (success && task.enabled) {
        // 如果任务已启用，为其设置定时器
        this.timerManager.scheduleTask(task);
      }

      return success;
    } catch (error) {
      logger.error('TaskLifecycle', '添加任务时出错', error);
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
        logger.error('TaskLifecycle', '更新任务失败：任务缺少ID');
        return false;
      }

      // 获取原始任务状态
      const originalTask = await this.taskManager.getTaskById(task.id);
      const wasEnabled = originalTask?.enabled ?? false;

      // 更新任务
      const success = await this.taskManager.updateTask(task);

      if (success) {
        // 如果任务状态从禁用变为启用，或者任务保持启用状态但调度信息更改
        if (
          task.enabled &&
          (!wasEnabled ||
            (originalTask &&
              (originalTask.schedule.type !== task.schedule.type ||
                originalTask.schedule.hour !== task.schedule.hour ||
                originalTask.schedule.minute !== task.schedule.minute ||
                (task.schedule.type === 'weekly' &&
                  originalTask.schedule.dayOfWeek !==
                    task.schedule.dayOfWeek))))
        ) {
          // 重新调度任务
          this.timerManager.scheduleTask(task);
        }
        // 如果任务从启用变为禁用，清除定时器
        else if (!task.enabled && wasEnabled) {
          this.timerManager.cancelTask(task.id);
        }
      }

      return success;
    } catch (error) {
      logger.error('TaskLifecycle', '更新任务时出错', error);
      return false;
    }
  }

  /**
   * 删除任务
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      // 清除定时器
      this.timerManager.cancelTask(taskId);

      // 从存储中删除任务
      return await this.taskManager.deleteTask(taskId);
    } catch (error) {
      logger.error('TaskLifecycle', '删除任务时出错', error);
      return false;
    }
  }

  /**
   * 取消任务调度（只清除定时器，不删除任务）
   */
  public async cancelTask(taskId: string): Promise<boolean> {
    try {
      return this.timerManager.cancelTask(taskId);
    } catch (error) {
      logger.error('TaskLifecycle', '取消任务时出错', error);
      return false;
    }
  }

  /**
   * 立即执行任务
   */
  public async runTaskNow(
    taskId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const task = await this.taskManager.getTaskById(taskId);

      if (!task) {
        return {
          success: false,
          message: `找不到ID为 ${taskId} 的任务`,
        };
      }

      // 如果任务已在执行中，返回提示
      if (this.taskExecutor.isTaskRunning(taskId)) {
        return {
          success: false,
          message: `任务 ${task.name} 已在执行中`,
        };
      }

      // 执行任务
      await this.taskExecutor.executeTaskManually(task);

      return {
        success: true,
        message: `任务 ${task.name} 执行完成`,
      };
    } catch (error) {
      return {
        success: false,
        message: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 手动执行任务（公开方法）
   */
  public async executeTaskManually(task: ScheduledTask): Promise<void> {
    await this.taskExecutor.executeTaskManually(task);
  }

  /**
   * 检查任务是否正在执行
   */
  public isTaskRunning(taskId: string): boolean {
    return this.taskExecutor.isTaskRunning(taskId);
  }

  /**
   * 获取最后一次执行错误
   */
  public getLastError(): Error | null {
    return this.taskExecutor.getLastError();
  }
}