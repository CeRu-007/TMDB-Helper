/**
 * ProjectManager
 * 负责处理项目关联、完结项目检查和清理
 */

import { StorageManager, ScheduledTask, TMDBItem } from '../storage';
import { taskExecutionLogger } from '../task-execution-logger';
import {
  RelatedItemStrategy,
  RelatedItemResult,
  RelinkTaskResult,
  CompletedProjectCheckResult,
} from './types';

/**
 * 项目管理器
 * 处理项目关联、完结项目检查和清理逻辑
 */
export class ProjectManager {
  /**
   * 获取关联项目，包含多种备用策略
   */
  public async getRelatedItem(task: ScheduledTask): Promise<TMDBItem | null> {
    try {
      const items = await StorageManager.getItemsWithRetry();

      if (items.length === 0) {
        throw new Error(`系统中没有可用项目，请先添加项目`);
      }

      // 策略1：直接通过ID匹配
      const foundItem = items.find((item) => item.id === task.itemId);
      if (foundItem) {
        console.log(
          `[ProjectManager] 直接通过ID找到了项目: ${foundItem.title} (ID: ${foundItem.id})`,
        );
        return foundItem;
      }

      // 策略2：通过TMDB ID匹配
      if (task.itemTmdbId) {
        const tmdbMatch = items.find((item) => item.tmdbId === task.itemTmdbId);
        if (tmdbMatch) {
          console.log(
            `[ProjectManager] 通过TMDB ID找到了项目: ${tmdbMatch.title} (ID: ${tmdbMatch.id})`,
          );
          await this.updateTaskItemId(task.id, tmdbMatch.id);
          return tmdbMatch;
        }
      }

      // 策略3：通过标题精确匹配
      if (task.itemTitle) {
        const titleMatch = items.find((item) => item.title === task.itemTitle);
        if (titleMatch) {
          console.log(
            `[ProjectManager] 通过标题精确匹配找到了项目: ${titleMatch.title} (ID: ${titleMatch.id})`,
          );
          await this.updateTaskItemId(task.id, titleMatch.id);
          return titleMatch;
        }
      }

      // 策略4：通过标题模糊匹配
      if (task.itemTitle) {
        const possibleItems = items.filter(
          (item) =>
            (item.title.includes(task.itemTitle) &&
              item.title.length - task.itemTitle.length < 10) ||
            (task.itemTitle.includes(item.title) &&
              task.itemTitle.length - item.title.length < 10),
        );

        if (possibleItems.length > 0) {
          // 如果只有一个匹配项，直接使用
          if (possibleItems.length === 1) {
            const matchItem = possibleItems[0];
            console.log(
              `[ProjectManager] 选择唯一的模糊匹配项: ${matchItem.title} (ID: ${matchItem.id})`,
            );
            await this.updateTaskItemId(task.id, matchItem.id);
            return matchItem;
          }

          // 如果有多个，尝试找到与任务创建时间最接近的项目
          const sameTypeItems = [...possibleItems].sort(
            (a, b) =>
              Math.abs(
                new Date(a.createdAt).getTime() -
                  new Date(task.createdAt).getTime(),
              ) -
              Math.abs(
                new Date(b.createdAt).getTime() -
                  new Date(task.createdAt).getTime(),
              ),
          );
          const bestMatch = sameTypeItems[0];
          console.log(
            `[ProjectManager] 从多个同类型候选项中选择创建时间最接近的: ${bestMatch.title} (ID: ${bestMatch.id})`,
          );
          await this.updateTaskItemId(task.id, bestMatch.id);
          return bestMatch;
        }
      }

      // 策略5：尝试紧急修复 - 检查特定问题ID
      if (task.itemId === '1749566411729') {
        // 检查是否有最近创建的项目可能是此ID的正确对应项
        const recentItems = [...items]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 10); // 获取最近创建的10个项目

        console.log(
          `[ProjectManager] 最近创建的项目: ${recentItems.map((item) => `${item.title} (ID: ${item.id}, 创建时间: ${item.createdAt})`).join(', ')}`,
        );

        if (recentItems.length > 0) {
          // 选择第一个项目作为应急措施
          const emergencyItem = recentItems[0];
          console.log(
            `[ProjectManager] 应急修复: 将使用最近创建的项目 ${emergencyItem.title} (ID: ${emergencyItem.id}) 替代问题ID`,
          );
          await this.updateTaskItemId(task.id, emergencyItem.id);
          return emergencyItem;
        }
      }

      // 策略6：任务名称解析匹配 - 尝试从任务名称中提取可能的项目标题
      const taskNameWithoutSuffix = task.name.replace(/\s*定时任务$/, '');

      const nameMatchItems = items.filter(
        (item) =>
          (item.title.includes(taskNameWithoutSuffix) &&
            item.title.length - taskNameWithoutSuffix.length < 15) ||
          (taskNameWithoutSuffix.includes(item.title) &&
            taskNameWithoutSuffix.length - item.title.length < 15),
      );

      if (nameMatchItems.length > 0) {
        // 如果只有一个匹配项，直接使用
        if (nameMatchItems.length === 1) {
          const nameMatch = nameMatchItems[0];
          console.log(
            `[ProjectManager] 通过任务名称找到匹配项: ${nameMatch.title} (ID: ${nameMatch.id})`,
          );
          await this.updateTaskItemId(task.id, nameMatch.id);
          return nameMatch;
        }

        // 如果有多个，使用创建时间最接近的
        const sortedByDate = [...nameMatchItems].sort(
          (a, b) =>
            Math.abs(
              new Date(a.createdAt).getTime() -
                new Date(task.createdAt).getTime(),
            ) -
            Math.abs(
              new Date(b.createdAt).getTime() -
                new Date(task.createdAt).getTime(),
            ),
        );

        const closestMatch = sortedByDate[0];
        console.log(
          `[ProjectManager] 从多个名称匹配项中选择创建时间最接近的: ${closestMatch.title} (ID: ${closestMatch.id})`,
        );
        await this.updateTaskItemId(task.id, closestMatch.id);
        return closestMatch;
      }

      // 策略7：完全备用 - 如果所有策略都失败，使用最近创建的项目
      const sortedByDate = [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      if (sortedByDate.length > 0) {
        const lastResortItem = sortedByDate[0];
        console.log(
          `[ProjectManager] 备用策略: 使用最近创建的项目 ${lastResortItem.title} (ID: ${lastResortItem.id})`,
        );
        await this.updateTaskItemId(task.id, lastResortItem.id);
        return lastResortItem;
      }

      // 如果所有策略都失败，返回null
      console.warn(
        `[ProjectManager] 无法找到任务 ${task.id} (${task.name}) 的关联项目，所有匹配策略均失败`,
      );

      return null;
    } catch (error) {
      console.error(
        `[ProjectManager] 获取关联项目时出错:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * 尝试重新关联任务到有效项目
   */
  public async attemptToRelinkTask(
    task: ScheduledTask,
  ): Promise<RelinkTaskResult> {
    try {
      console.log(`[ProjectManager] 尝试重新关联任务 ${task.id} (${task.name})`);

      // 获取所有项目
      const items = await StorageManager.getItemsWithRetry();

      if (items.length === 0) {
        return {
          success: false,
          message: '系统中没有任何项目，无法关联任务',
        };
      }

      // 策略1: 通过TMDB ID匹配
      if (task.itemTmdbId) {
        console.log(
          `[ProjectManager] 尝试通过TMDB ID (${task.itemTmdbId}) 匹配项目`,
        );
        const matchByTmdbId = items.find(
          (item) => item.tmdbId === task.itemTmdbId,
        );

        if (matchByTmdbId) {
          console.log(
            `[ProjectManager] 通过TMDB ID匹配到项目: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`,
          );
          return {
            success: true,
            message: `已通过TMDB ID关联到项目 ${matchByTmdbId.title}`,
            newItemId: matchByTmdbId.id,
          };
        }
      }

      // 策略2: 通过项目标题匹配
      if (task.itemTitle) {
        console.log(
          `[ProjectManager] 尝试通过标题 (${task.itemTitle}) 匹配项目`,
        );

        // 模糊匹配
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
            `[ProjectManager] 通过标题匹配到项目: ${matchByTitle.title} (ID: ${matchByTitle.id})`,
          );
          return {
            success: true,
            message: `已通过标题关联到项目 ${matchByTitle.title}`,
            newItemId: matchByTitle.id,
          };
        }
      }

      // 策略3: 通过任务名称提取可能的标题
      if (task.name) {
        const possibleTitle = task.name.replace(/\s*定时任务$/, '');
        console.log(
          `[ProjectManager] 尝试通过任务名称提取的标题 (${possibleTitle}) 匹配项目`,
        );

        // 模糊匹配
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
            `[ProjectManager] 通过任务名称匹配到项目: ${matchByTaskName.title} (ID: ${matchByTaskName.id})`,
          );
          return {
            success: true,
            message: `已通过任务名称关联到项目 ${matchByTaskName.title}`,
            newItemId: matchByTaskName.id,
          };
        }
      }

      // 策略4: 使用最近创建的项目作为最后手段
      const sortedItems = [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      if (sortedItems.length > 0) {
        const fallbackItem = sortedItems[0];
        console.log(
          `[ProjectManager] 使用最近创建的项目: ${fallbackItem.title} (ID: ${fallbackItem.id})`,
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
      return {
        success: false,
        message: `重新关联任务失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 更新任务的itemId
   */
  private async updateTaskItemId(
    taskId: string,
    newItemId: string,
  ): Promise<void> {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      const taskIndex = tasks.findIndex((t) => t.id === taskId);

      if (taskIndex !== -1) {
        tasks[taskIndex].itemId = newItemId;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        await StorageManager.updateScheduledTask(tasks[taskIndex]);
      }
    } catch (error) {
      console.error(
        `[ProjectManager] 更新任务itemId时出错:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 检查并处理已完结项目的任务自动删除
   */
  public async checkAndHandleCompletedProject(
    task: ScheduledTask,
    relatedItem: TMDBItem,
  ): Promise<boolean> {
    try {
      // 检查任务是否启用了自动删除选项
      if (!task.action.autoDeleteWhenCompleted) {
        return false;
      }

      // 检查项目是否已完结
      const isCompleted =
        relatedItem.status === 'completed' || relatedItem.completed === true;

      if (!isCompleted) {
        return false;
      }

      // 记录删除日志
      await taskExecutionLogger.addLog(
        task.id,
        '自动删除',
        `项目已完结，自动删除定时任务`,
        'info',
      );

      // 从存储中删除任务
      const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);

      if (deleteSuccess) {
        // 记录最终删除日志
        await taskExecutionLogger.addLog(
          task.id,
          '删除完成',
          `定时任务已自动删除`,
          'success',
        );

        return true; // 返回true表示任务已被删除
      } else {
        await taskExecutionLogger.addLog(
          task.id,
          '删除失败',
          `自动删除定时任务失败`,
          'error',
        );
        return false;
      }
    } catch (error) {
      await taskExecutionLogger.addLog(
        task.id,
        '检查错误',
        `检查项目完结状态时出错: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
      return false;
    }
  }

  /**
   * 删除已完结项目的定时任务
   */
  public async deleteCompletedTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(
        `[ProjectManager] 删除已完结项目的定时任务: ${task.name} (ID: ${task.id})`,
      );

      // 从存储中删除任务
      const deleteSuccess = await StorageManager.deleteScheduledTask(task.id);

      if (deleteSuccess) {
        // 强制刷新任务列表
        await StorageManager.forceRefreshScheduledTasks();

        // 通知实时同步管理器任务已完成并删除
        try {
          const { realtimeSyncManager } =
            await import('../realtime-sync-manager');
          await realtimeSyncManager.notifyDataChange({
            type: 'task_completed',
            data: {
              taskId: task.id,
              itemId: task.itemId,
              itemTitle: task.itemTitle,
              deleted: true,
            },
            source: 'scheduled_task',
          });
        } catch (syncError) {
          console.error(
            `[ProjectManager] 通知实时同步管理器失败:`,
            syncError,
          );
        }
      }
    } catch (error) {
      console.error(
        `[ProjectManager] 删除已完结任务时出错:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 清理已完结项目的定时任务
   */
  public async cleanupCompletedProjectTasks(): Promise<void> {
    try {
      // 获取所有定时任务
      const tasks = await StorageManager.getScheduledTasks();
      const enabledTasks = tasks.filter(
        (task) => task.enabled && task.action.autoDeleteWhenCompleted,
      );

      if (enabledTasks.length === 0) {
        return;
      }

      // 获取所有项目
      const items = await StorageManager.getItemsWithRetry();
      let deletedCount = 0;

      for (const task of enabledTasks) {
        try {
          // 查找对应的项目
          const relatedItem = items.find((item) => item.id === task.itemId);

          if (!relatedItem) {
            continue;
          }

          // 检查项目是否已完结
          const isCompleted =
            relatedItem.status === 'completed' ||
            relatedItem.completed === true;

          if (isCompleted) {
            // 从存储中删除任务
            const deleteSuccess = await StorageManager.deleteScheduledTask(
              task.id,
            );

            if (deleteSuccess) {
              deletedCount++;
            }
          }
        } catch (error) {
          console.error(
            `[ProjectManager] 清理任务 ${task.id} 时出错:`,
            error,
          );
        }
      }

      if (deletedCount > 0) {
        console.log(
          `[ProjectManager] 清理了 ${deletedCount} 个已完结项目的任务`,
        );
      }
    } catch (error) {
      console.error(
        `[ProjectManager] 清理已完结项目任务时出错:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}