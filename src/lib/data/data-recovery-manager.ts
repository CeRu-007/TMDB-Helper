/**
 * 数据恢复管理器
 * 处理数据导出过程中的错误恢复和数据验证
 */

import { TMDBItem, ScheduledTask, StorageManager } from './storage';

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  itemCount: number;
  taskCount: number;
  corruptedData?: unknown;
}

export interface DataRecoveryOptions {
  includeBackup: boolean;
  validateData: boolean;
  autoFix: boolean;
  maxRetries: number;
}

export interface ExportResult {
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
  stats?: {
    itemCount: number;
    taskCount: number;
    dataSource: string;
    exportTime: string;
  };
}

class DataRecoveryManager {
  private static instance: DataRecoveryManager;
  private readonly BACKUP_PREFIX = 'tmdb_helper_backup_';
  private readonly MAX_BACKUP_AGE = 7 * 24 * 60 * 60 * 1000; // 7天

  private constructor() {}

  public static getInstance(): DataRecoveryManager {
    if (!DataRecoveryManager.instance) {
      DataRecoveryManager.instance = new DataRecoveryManager();
    }
    return DataRecoveryManager.instance;
  }

  /**
   * 验证数据完整性
   */
  public async validateData(): Promise<DataValidationResult> {
    const result: DataValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemCount: 0,
      taskCount: 0,
    };

    try {
      // 验证项目数据
      const items = await this.getItemsWithFallback();
      result.itemCount = items.length;

      if (items.length === 0) {
        result.warnings.push('没有找到项目数据');
      } else {
        // 验证项目数据结构
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.id) {
            result.errors.push(`项目 ${i} 缺少ID`);
            result.isValid = false;
          }
          if (!item.title) {
            result.errors.push(`项目 ${i} 缺少标题`);
            result.isValid = false;
          }
        }
      }

      // 验证任务数据
      try {
        const tasks = await StorageManager.getScheduledTasks();
        result.taskCount = tasks.length;

        // 验证任务数据结构
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          if (!task.id) {
            result.errors.push(`任务 ${i} 缺少ID`);
            result.isValid = false;
          }
          if (!task.itemId) {
            result.errors.push(`任务 ${i} 缺少关联项目ID`);
            result.isValid = false;
          }
        }
      } catch (taskError) {
        result.errors.push(
          `读取任务数据失败: ${taskError instanceof Error ? taskError.message : '未知错误'}`,
        );
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(
        `数据验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * 获取项目数据（带降级方案）
   */
  private async getItemsWithFallback(): Promise<TMDBItem[]> {
    const fallbackMethods = [
      // 方法1: 从API获取
      async () => {
        const response = await fetch('/api/storage/file-operations');
        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'API返回失败');
        return result.items || [];
      },

      // 方法2: 从StorageManager获取
      async () => await StorageManager.getItemsWithRetry(),

      // 方法3: 直接从localStorage获取
      async () => {
        if (typeof window === 'undefined' || !window.localStorage) {
          throw new Error('localStorage不可用');
        }
        const data = localStorage.getItem('tmdb_helper_items');
        if (!data) return [];
        return JSON.parse(data);
      },
    ];

    let lastError: Error | null = null;

    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        const items = await fallbackMethods[i]();

        return items;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');
      }
    }

    throw lastError || new Error('所有获取项目数据的方法都失败了');
  }

  /**
   * 安全导出数据
   */
  public async safeExportData(
    options: DataRecoveryOptions = {
      includeBackup: true,
      validateData: true,
      autoFix: true,
      maxRetries: 3,
    },
  ): Promise<ExportResult> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < options.maxRetries) {
      try {
        attempt++;

        // 验证数据
        if (options.validateData) {
          const validation = await this.validateData();
          if (!validation.isValid) {
            if (options.autoFix) {
              await this.attemptDataFix(validation);
            } else {
              throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
            }
          }
        }

        // 获取数据
        const items = await this.getItemsWithFallback();
        const tasks = await StorageManager.getScheduledTasks();

        // 创建导出数据
        const exportData = {
          items,
          tasks,
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          dataSource: 'DataRecoveryManager',
          stats: {
            itemCount: items.length,
            taskCount: tasks.length,
          },
        };

        // 创建备份
        if (options.includeBackup) {
          await this.createBackup(exportData);
        }

        const jsonData = JSON.stringify(exportData, null, 2);
        const filename = `tmdb-helper-safe-backup-${new Date().toISOString().split('T')[0]}.json`;

        return {
          success: true,
          data: jsonData,
          filename,
          stats: {
            itemCount: items.length,
            taskCount: tasks.length,
            dataSource: 'DataRecoveryManager',
            exportTime: new Date().toISOString(),
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('未知错误');

        if (attempt < options.maxRetries) {
          // 等待后重试
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: `导出失败，已尝试 ${options.maxRetries} 次。最后错误: ${lastError?.message || '未知错误'}`,
    };
  }

  /**
   * 尝试修复数据问题
   */
  private async attemptDataFix(
    validation: DataValidationResult,
  ): Promise<void> {
    // 修复任务数据
    if (validation.errors.some((error) => error.includes('任务'))) {
      try {
        await StorageManager.forceRefreshScheduledTasks();
      } catch (error) {}
    }

    // 清理损坏的localStorage数据
    if (validation.errors.some((error) => error.includes('localStorage'))) {
      try {
        this.cleanupCorruptedData();
      } catch (error) {}
    }
  }

  /**
   * 清理损坏的数据
   */
  private cleanupCorruptedData(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keys = Object.keys(localStorage);
    const corruptedKeys = keys.filter(
      (key) =>
        key.includes('corrupted') ||
        (key.includes('backup') &&
          Date.now() - parseInt(key.split('_').pop() || '0') >
            this.MAX_BACKUP_AGE),
    );

    corruptedKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {}
    });
  }

  /**
   * 创建数据备份
   */
  private async createBackup(data: unknown): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const backupKey = `${this.BACKUP_PREFIX}${Date.now()}`;
      const backupData = JSON.stringify(data);
      localStorage.setItem(backupKey, backupData);

      // 清理旧备份
      this.cleanupOldBackups();
    } catch (error) {}
  }

  /**
   * 清理旧备份
   */
  private cleanupOldBackups(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter((key) => key.startsWith(this.BACKUP_PREFIX));

    // 按时间排序，保留最新的5个备份
    const sortedBackups = backupKeys
      .map((key) => ({
        key,
        timestamp: parseInt(key.replace(this.BACKUP_PREFIX, '')),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // 删除超过5个的旧备份
    sortedBackups.slice(5).forEach((backup) => {
      try {
        localStorage.removeItem(backup.key);
      } catch (error) {}
    });
  }
}

export const dataRecoveryManager = DataRecoveryManager.getInstance();
