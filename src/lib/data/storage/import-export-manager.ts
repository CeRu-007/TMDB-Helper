import { StorageBase } from './storage-base';
import { ScheduledTask } from './types';

export class ImportExportManager extends StorageBase {
  /**
   * 导出数据
   */
  static async exportData(): Promise<string> {
    try {
      const items = await this.getItemsWithRetry();
      const tasks = await this.getScheduledTasks();

      const exportData = {
        items,
        tasks,
        version: '1.0.0',
        exportDate: new Date().toISOString(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 验证导入数据格式
   */
  static validateImportData(jsonData: string): {
    isValid: boolean;
    error?: string;
    data?: {
      items: unknown[];
      tasks: ScheduledTask[];
      version?: string;
      exportDate?: string;
    };
    stats?: {
      itemCount: number;
      taskCount: number;
      validItemCount: number;
      validTaskCount: number;
    };
    isDuplicate?: boolean; // 新增：标识是否为重复数据
    duplicateInfo?: string; // 新增：重复信息描述
  } {
    try {
      const parsedData = JSON.parse(jsonData);
      // console.log('解析后的数据结构:', {
      //   isArray: Array.isArray(parsedData),
      //   hasItems: !!parsedData.items,
      //   hasItemsArray: Array.isArray(parsedData.items),
      //   hasTasks: !!parsedData.tasks,
      //   hasTasksArray: Array.isArray(parsedData.tasks),
      //   version: parsedData.version,
      //   exportDate: parsedData.exportDate,
      // });

      let items: unknown[] = [];
      let tasks: ScheduledTask[] = [];
      let version: string | undefined;
      let exportDate: string | undefined;

      // 检查数据格式
      if (Array.isArray(parsedData)) {
        // 旧格式：直接是项目数组
        items = parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        // 新格式：包含items和tasks
        if (parsedData.items && Array.isArray(parsedData.items)) {
          items = parsedData.items;
        } else {
          return {
            isValid: false,
            error: '数据格式错误：缺少items字段或items不是数组',
          };
        }

        if (parsedData.tasks && Array.isArray(parsedData.tasks)) {
          tasks = parsedData.tasks;
        } else {
          // 允许没有tasks字段
        }

        version = parsedData.version;
        exportDate = parsedData.exportDate;
      } else {
        return {
          isValid: false,
          error: '数据格式错误：不支持的数据结构',
        };
      }

      // 验证项目数据
      const validItems = items.filter((item) => {
        // 基本结构检查
        if (!item || typeof item !== 'object') {
          return false;
        }

        // 必需字段检查
        const requiredFields = ['id', 'title', 'mediaType', 'tmdbId'];
        for (const field of requiredFields) {
          if (!item[field as keyof unknown]) {
            return false;
          }
        }

        // mediaType值检查
        if (!['movie', 'tv'].includes(item.mediaType)) {
          return false;
        }

        return true;
      });

      // 验证任务数据
      const validTasks = tasks.filter((task) => {
        // 基本结构检查
        if (!task || typeof task !== 'object') {
          return false;
        }

        // 必需字段检查（更宽松的验证规则）
        if (!task.itemId || !task.name) {
          // console.warn(`Task missing required fields (itemId or name)`, task);
          return false;
        }

        // 如果没有type字段，默认设置为tmdb-import
        if (!task.type) {
          task.type = 'tmdb-import';
        }

        return true;
      });

      return {
        isValid: true,
        data: {
          items: validItems,
          tasks: validTasks,
          ...(version && { version }),
          ...(exportDate && { exportDate }),
        },
        stats: {
          itemCount: items.length,
          taskCount: tasks.length,
          validItemCount: validItems.length,
          validTaskCount: validTasks.length,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'JSON解析失败',
      };
    }
  }

  /**
   * 导入数据
   */
  static async importData(jsonData: string): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      itemsImported: number;
      tasksImported: number;
      itemsSkipped: number;
      tasksSkipped: number;
    };
  }> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      return {
        success: false,
        error: 'localStorage不可用',
      };
    }

    // 首先验证数据
    const validation = this.validateImportData(jsonData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || '验证失败',
      };
    }

    const { items, tasks } = validation.data || { items: [], tasks: [] };
    const stats = validation.stats || {
      itemCount: 0,
      taskCount: 0,
      validItemCount: 0,
      validTaskCount: 0,
    };

    try {
      // 导入项目数据
      if (this.USE_FILE_STORAGE) {
        try {
          // 发送完整的导出格式给服务器，让服务器端处理格式兼容性
          const serverData = {
            items,
            tasks: [], // 服务器端暂时不处理任务，任务仍然保存在客户端
            version: '1.0.0',
            exportDate: new Date().toISOString(),
          };

          const response = await fetch(`${this.API_BASE_URL}/data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          return {
            success: false,
            error: `导入项目失败: ${error instanceof Error ? error.message : '未知错误'}`,
          };
        }
      } else {
        // 使用localStorage
        this.saveItems(items);
      }

      // 导入定时任务
      let tasksImported = 0;
      if (tasks.length > 0) {
        // 规范化任务
        const normalizedTasks = tasks.map((task) => this.normalizeTask(task));

        try {
          // 使用服务端API批量导入任务
          for (const task of normalizedTasks) {
            const response = await fetch('/api/tasks/scheduled-tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(task),
            });

            if (response.ok) {
              tasksImported++;
            } else {
              // console.error(
              //   `导入任务失败: ${task.name}`,
              //   await response.text(),
              // );
            }
          }
        } catch (_error) {
          // 任务导入失败不应该影响整个导入过程
          // console.error('导入任务时发生错误:', error);
        }
      }

      return {
        success: true,
        stats: {
          itemsImported: stats.validItemCount,
          tasksImported,
          itemsSkipped: stats.itemCount - stats.validItemCount,
          tasksSkipped: stats.taskCount - stats.validTaskCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '导入过程中发生未知错误',
      };
    }
  }

  /**
   * 规范化任务对象，确保所有必要字段都存在
   */
  private static normalizeTask(task: unknown): ScheduledTask {
    return {
      id: task.id || '',
      itemId: task.itemId || '',
      itemTitle: task.itemTitle || '',
      itemTmdbId: task.itemTmdbId || undefined,
      name: task.name || '未命名任务',
      type: 'tmdb-import',
      schedule: {
        type: task.schedule?.type || 'weekly',
        dayOfWeek: task.schedule?.dayOfWeek ?? new Date().getDay(),
        secondDayOfWeek: task.schedule?.secondDayOfWeek ?? undefined,
        hour: task.schedule?.hour ?? new Date().getHours(),
        minute: task.schedule?.minute ?? 0,
      },
      action: {
        seasonNumber: task.action?.seasonNumber ?? 1,
        autoUpload: task.action?.autoUpload ?? true,
        conflictAction: task.action?.conflictAction ?? 'w',
        autoRemoveMarked: task.action?.autoRemoveMarked ?? true,
        autoConfirm: task.action?.autoConfirm !== false,
        autoMarkUploaded: task.action?.autoMarkUploaded !== false,
        removeAirDateColumn: task.action?.removeAirDateColumn === true,
        removeRuntimeColumn: task.action?.removeRuntimeColumn === true,
        removeBackdropColumn: task.action?.removeBackdropColumn === true,
      },
      enabled: task.enabled ?? false,
      lastRun: task.lastRun || undefined,
      nextRun: task.nextRun || undefined,
      lastRunStatus: task.lastRunStatus,
      lastRunError: task.lastRunError,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * 调试方法：创建测试数据并尝试导入
   */
  static async debugImport(): Promise<void> {
    // 创建测试数据
    const testData = {
      items: [
        {
          id: 'debug-test-1',
          title: '调试测试项目',
          mediaType: 'tv' as const,
          tmdbId: '999999',
          weekday: 1,
          completed: false,
          status: 'ongoing' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      tasks: [],
      version: '1.0.0',
      exportDate: new Date().toISOString(),
    };

    const jsonData = JSON.stringify(testData, null, 2);

    try {
      // 1. 测试验证
      const validation = this.validateImportData(jsonData);
      if (!validation.isValid) {
        // console.error('验证失败:', validation.error);
        return;
      }

      // 2. 测试导入
      const importResult = await this.importData(jsonData);
      if (!importResult.success) {
        return;
      }
    } catch {
      // 忽略调试导入错误
    }
  }

  /**
   * 获取所有定时任务（从TaskManager借用）
   */
  private static async getScheduledTasks(): Promise<ScheduledTask[]> {
    try {
      const response = await fetch('/api/tasks/scheduled-tasks');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '获取定时任务失败');
      }

      return result.tasks || [];
    } catch {
      return [];
    }
  }
}
