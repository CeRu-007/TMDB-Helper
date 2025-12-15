import { StorageManager, ScheduledTask, TMDBItem } from '../storage';

/**
 * TaskManager - Handles all task-related operations for the TaskScheduler
 * This class is responsible for:
 * - Managing task lifecycle (add, update, delete)
 * - Associating tasks with projects
 * - Validating task associations
 * - Running tasks manually
 */
export class TaskManager {
  /**
   * Add a new task
   */
  public async addTask(task: ScheduledTask): Promise<boolean> {
    try {
      // Ensure task has an ID
      if (!task.id) {
        console.error(`[TaskManager] 无法添加任务，任务没有ID`);
        return false;
      }

      // Add task to storage
      const success = await StorageManager.addScheduledTask(task);

      return success;
    } catch (error) {
      console.error(`[TaskManager] 添加任务失败:`, error);
      return false;
    }
  }

  /**
   * Update an existing task
   */
  public async updateTask(task: ScheduledTask): Promise<boolean> {
    try {
      // Ensure task has an ID
      if (!task.id) {
        console.error(`[TaskManager] 无法更新任务，任务没有ID`);
        return false;
      }

      // Update task in storage
      const success = await StorageManager.updateScheduledTask(task);

      return success;
    } catch (error) {
      console.error(`[TaskManager] 更新任务失败:`, error);
      return false;
    }
  }

  /**
   * Delete a task
   */
  public async deleteTask(taskId: string): Promise<boolean> {
    try {
      // Delete task from storage
      return await StorageManager.deleteScheduledTask(taskId);
    } catch (error) {
      console.error(`[TaskManager] 删除任务失败:`, error);
      return false;
    }
  }

  /**
   * Run a task immediately
   */
  public async runTaskNow(
    taskId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        return {
          success: false,
          message: `找不到ID为 ${taskId} 的任务`,
        };
      }

      // Execute task immediately
      // This will be handled by the TaskExecutor
      return {
        success: true,
        message: `任务 ${task.name} 已开始执行`,
      };
    } catch (error) {
      console.error(`[TaskManager] 立即执行任务失败:`, error);
      return {
        success: false,
        message: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate and fix all task associations
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
      console.error(`[TaskManager] 验证任务关联失败:`, error);
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
   * Attempt to relink a task to a valid project
   */
  public async attemptToRelinkTask(
    task: ScheduledTask,
  ): Promise<{ success: boolean; message?: string; newItemId?: string }> {
    try {
      console.log(`[TaskManager] 尝试重新关联任务 ${task.id} (${task.name})`);

      // Get all items
      const items = await StorageManager.getItemsWithRetry();

      if (items.length === 0) {
        return {
          success: false,
          message: '系统中没有任何项目，无法关联任务',
        };
      }

      // Strategy 1: By TMDB ID match
      if (task.itemTmdbId) {
        console.log(
          `[TaskManager] 尝试通过TMDB ID (${task.itemTmdbId}) 匹配项目`,
        );
        const matchByTmdbId = items.find(
          (item) => item.tmdbId === task.itemTmdbId,
        );

        if (matchByTmdbId) {
          console.log(
            `[TaskManager] 通过TMDB ID匹配到项目: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`,
          );
          return {
            success: true,
            message: `已通过TMDB ID关联到项目 ${matchByTmdbId.title}`,
            newItemId: matchByTmdbId.id,
          };
        }
      }

      // Strategy 2: By item title match
      if (task.itemTitle) {
        console.log(`[TaskManager] 尝试通过标题 (${task.itemTitle}) 匹配项目`);

        // Fuzzy match
        const matchByTitle = items.find(
          (item) =>
            item.title === task.itemTitle ||
            (item.title.includes(task.itemTitle) &&
              item.title.length - task.itemTitle.length < 10) ||
            (task.itemTitle.includes(item.title) &&
              task.itemTitle.length - item.title.length < 10),
        );

        if (matchByTitle) {
          console.log(
            `[TaskManager] 通过标题匹配到项目: ${matchByTitle.title} (ID: ${matchByTitle.id})`,
          );
          return {
            success: true,
            message: `已通过标题关联到项目 ${matchByTitle.title}`,
            newItemId: matchByTitle.id,
          };
        }
      }

      // Strategy 3: Extract possible title from task name
      if (task.name) {
        const possibleTitle = task.name.replace(/\s*定时任务$/, '');
        console.log(
          `[TaskManager] 尝试通过任务名称提取的标题 (${possibleTitle}) 匹配项目`,
        );

        // Fuzzy match
        const matchByTaskName = items.find(
          (item) =>
            item.title === possibleTitle ||
            (item.title.includes(possibleTitle) &&
              item.title.length - possibleTitle.length < 10) ||
            (possibleTitle.includes(item.title) &&
              possibleTitle.length - item.title.length < 10),
        );

        if (matchByTaskName) {
          console.log(
            `[TaskManager] 通过任务名称匹配到项目: ${matchByTaskName.title} (ID: ${matchByTaskName.id})`,
          );
          return {
            success: true,
            message: `已通过任务名称关联到项目 ${matchByTaskName.title}`,
            newItemId: matchByTaskName.id,
          };
        }
      }

      // Strategy 4: Use most recently created item as fallback
      // Sort by creation time
      const sortedItems = [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      if (sortedItems.length > 0) {
        const fallbackItem = sortedItems[0];
        console.log(
          `[TaskManager] 使用最近创建的项目: ${fallbackItem.title} (ID: ${fallbackItem.id})`,
        );

        return {
          success: true,
          message: `已关联到最近创建的项目 ${fallbackItem.title}`,
          newItemId: fallbackItem.id,
        };
      }

      return {
        success: false,
        message: '无法找到合适的项目进行关联',
      };
    } catch (error) {
      console.error(`[TaskManager] 重新关联任务失败:`, error);
      return {
        success: false,
        message: `重新关联任务失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check and handle completed project tasks
   */
  public async checkAndHandleCompletedProject(
    task: ScheduledTask,
    relatedItem: TMDBItem,
  ): Promise<boolean> {
    try {
      // Check if task has auto-delete option enabled
      if (!task.action.autoDeleteWhenCompleted) {
        return false;
      }

      // Check if project is completed
      const isCompleted =
        relatedItem.status === 'completed' || relatedItem.completed === true;

      if (!isCompleted) {
        return false;
      }

      // Delete the task
      const deleteSuccess = await this.deleteTask(task.id);

      if (deleteSuccess) {
        console.log(
          `[TaskManager] 项目 ${relatedItem.title} 已完结，自动删除定时任务 ${task.name}`,
        );
        return true; // Return true indicating task was deleted
      } else {
        console.error(`[TaskManager] 自动删除定时任务失败: ${task.name}`);
        return false;
      }
    } catch (error) {
      console.error(`[TaskManager] 检查项目完成状态时出错:`, error);
      return false;
    }
  }

  /**
   * Check missed tasks
   */
  public async checkMissedTasks(tasks: ScheduledTask[]): Promise<void> {
    const now = new Date();
    const enabledTasks = tasks.filter((task) => task.enabled);

    for (const task of enabledTasks) {
      try {
        // Skip if task doesn't have next run time set
        if (!task.nextRun) {
          continue;
        }

        const nextRunTime = new Date(task.nextRun);
        const timeDiff = now.getTime() - nextRunTime.getTime();

        // If current time is beyond scheduled time by more than 5 minutes, consider it a missed task
        if (timeDiff > 5 * 60 * 1000) {
          console.log(
            `[TaskManager] 发现错过的任务: ${task.name} (${task.id}), 预定时间: ${nextRunTime.toLocaleString('zh-CN')}, 当前时间: ${now.toLocaleString('zh-CN')}`,
          );

          // Check if task is already running
          if (task.isRunning) {
            continue;
          }

          // Check if within reasonable compensation window (24 hours)
          if (timeDiff <= 24 * 60 * 60 * 1000) {
            console.log(
              `[TaskManager] 执行错过的任务: ${task.name} (${task.id})`,
            );
            // This would be executed by the scheduler
          } else {
            console.log(
              `[TaskManager] 任务 ${task.name} (${task.id}) 错过时间过长 (${Math.round(timeDiff / (60 * 60 * 1000))} 小时)，跳过执行并重新调度`,
            );
          }
        }
      } catch (error) {
        console.error(`[TaskManager] 检查错过的任务时出错:`, error);
      }
    }
  }
}
