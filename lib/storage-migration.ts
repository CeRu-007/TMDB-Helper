/**
 * 存储迁移工具
 * 帮助用户从localStorage迁移到IndexedDB存储
 */

import { TMDBItem, ScheduledTask, StorageManager } from './storage';
import { indexedDBStorage } from './indexed-db-storage';
import { enhancedStorageManager } from './enhanced-storage-manager';

interface MigrationResult {
  success: boolean;
  itemsMigrated: number;
  tasksMigrated: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

interface MigrationProgress {
  stage: 'preparing' | 'items' | 'tasks' | 'cleanup' | 'completed';
  progress: number;
  message: string;
  itemsProcessed: number;
  tasksProcessed: number;
  totalItems: number;
  totalTasks: number;
}

export class StorageMigration {
  private static instance: StorageMigration;
  private migrationInProgress = false;
  private progressCallback?: (progress: MigrationProgress) => void;

  private constructor() {}

  static getInstance(): StorageMigration {
    if (!StorageMigration.instance) {
      StorageMigration.instance = new StorageMigration();
    }
    return StorageMigration.instance;
  }

  /**
   * 检查是否需要迁移
   */
  async checkMigrationNeeded(): Promise<{
    needed: boolean;
    reason: string;
    localStorageItems: number;
    localStorageTasks: number;
    indexedDBItems: number;
    indexedDBTasks: number;
  }> {
    try {
      // 检查localStorage中的数据
      const localItems = StorageManager.getItems();
      const localTasks = await StorageManager.getScheduledTasks();

      // 检查IndexedDB中的数据
      let indexedDBItems = 0;
      let indexedDBTasks = 0;
      
      try {
        await indexedDBStorage.init();
        const dbItems = await indexedDBStorage.getItems();
        const dbTasks = await indexedDBStorage.getTasks();
        indexedDBItems = dbItems.length;
        indexedDBTasks = dbTasks.length;
      } catch (error) {
        console.warn('无法访问IndexedDB:', error);
      }

      const hasLocalData = localItems.length > 0 || localTasks.length > 0;
      const hasIndexedDBData = indexedDBItems > 0 || indexedDBTasks > 0;

      let needed = false;
      let reason = '';

      if (hasLocalData && !hasIndexedDBData) {
        needed = true;
        reason = '检测到localStorage中有数据，但IndexedDB为空，建议迁移以获得更好的性能';
      } else if (hasLocalData && hasIndexedDBData) {
        // 检查数据是否同步
        if (localItems.length !== indexedDBItems || localTasks.length !== indexedDBTasks) {
          needed = true;
          reason = 'localStorage和IndexedDB中的数据不同步，建议重新迁移';
        } else {
          reason = '数据已同步，无需迁移';
        }
      } else if (!hasLocalData && !hasIndexedDBData) {
        reason = '没有检测到任何数据';
      } else {
        reason = 'IndexedDB中已有数据，localStorage为空';
      }

      return {
        needed,
        reason,
        localStorageItems: localItems.length,
        localStorageTasks: localTasks.length,
        indexedDBItems,
        indexedDBTasks
      };
    } catch (error) {
      console.error('检查迁移状态失败:', error);
      return {
        needed: false,
        reason: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        localStorageItems: 0,
        localStorageTasks: 0,
        indexedDBItems: 0,
        indexedDBTasks: 0
      };
    }
  }

  /**
   * 执行数据迁移
   */
  async migrate(
    options: {
      backupFirst?: boolean;
      clearLocalStorageAfter?: boolean;
      onProgress?: (progress: MigrationProgress) => void;
    } = {}
  ): Promise<MigrationResult> {
    if (this.migrationInProgress) {
      throw new Error('迁移正在进行中，请等待完成');
    }

    const startTime = Date.now();
    this.migrationInProgress = true;
    this.progressCallback = options.onProgress;

    const result: MigrationResult = {
      success: false,
      itemsMigrated: 0,
      tasksMigrated: 0,
      errors: [],
      warnings: [],
      duration: 0
    };

    try {
      console.log('开始存储迁移...');

      // 阶段1: 准备
      this.updateProgress({
        stage: 'preparing',
        progress: 0,
        message: '正在准备迁移...',
        itemsProcessed: 0,
        tasksProcessed: 0,
        totalItems: 0,
        totalTasks: 0
      });

      // 初始化IndexedDB
      await indexedDBStorage.init();

      // 获取localStorage中的数据
      const localItems = StorageManager.getItems();
      const localTasks = await StorageManager.getScheduledTasks();

      console.log(`发现 ${localItems.length} 个项目和 ${localTasks.length} 个任务需要迁移`);

      // 创建备份（如果需要）
      if (options.backupFirst) {
        try {
          const backupData = {
            items: localItems,
            tasks: localTasks,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          };
          
          const backupKey = `tmdb_helper_backup_${Date.now()}`;
          localStorage.setItem(backupKey, JSON.stringify(backupData));
          console.log(`已创建备份: ${backupKey}`);
        } catch (error) {
          result.warnings.push(`创建备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      // 阶段2: 迁移项目
      this.updateProgress({
        stage: 'items',
        progress: 10,
        message: '正在迁移项目数据...',
        itemsProcessed: 0,
        tasksProcessed: 0,
        totalItems: localItems.length,
        totalTasks: localTasks.length
      });

      if (localItems.length > 0) {
        try {
          // 验证和清理项目数据
          const validItems = this.validateAndCleanItems(localItems);
          if (validItems.length < localItems.length) {
            result.warnings.push(`${localItems.length - validItems.length} 个项目数据无效，已跳过`);
          }

          // 批量保存项目
          await indexedDBStorage.saveItems(validItems);
          result.itemsMigrated = validItems.length;
          
          console.log(`成功迁移 ${validItems.length} 个项目`);
        } catch (error) {
          const errorMsg = `迁移项目失败: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 阶段3: 迁移任务
      this.updateProgress({
        stage: 'tasks',
        progress: 60,
        message: '正在迁移任务数据...',
        itemsProcessed: result.itemsMigrated,
        tasksProcessed: 0,
        totalItems: localItems.length,
        totalTasks: localTasks.length
      });

      if (localTasks.length > 0) {
        let tasksProcessed = 0;
        
        for (const task of localTasks) {
          try {
            // 验证和清理任务数据
            const validTask = this.validateAndCleanTask(task);
            if (validTask) {
              await indexedDBStorage.saveTask(validTask);
              result.tasksMigrated++;
            } else {
              result.warnings.push(`任务 "${task.name}" 数据无效，已跳过`);
            }
          } catch (error) {
            const errorMsg = `迁移任务 "${task.name}" 失败: ${error instanceof Error ? error.message : '未知错误'}`;
            result.warnings.push(errorMsg);
            console.warn(errorMsg);
          }
          
          tasksProcessed++;
          
          // 更新进度
          this.updateProgress({
            stage: 'tasks',
            progress: 60 + (tasksProcessed / localTasks.length) * 30,
            message: `正在迁移任务数据... (${tasksProcessed}/${localTasks.length})`,
            itemsProcessed: result.itemsMigrated,
            tasksProcessed,
            totalItems: localItems.length,
            totalTasks: localTasks.length
          });
        }
        
        console.log(`成功迁移 ${result.tasksMigrated} 个任务`);
      }

      // 阶段4: 清理
      this.updateProgress({
        stage: 'cleanup',
        progress: 90,
        message: '正在清理...',
        itemsProcessed: result.itemsMigrated,
        tasksProcessed: result.tasksMigrated,
        totalItems: localItems.length,
        totalTasks: localTasks.length
      });

      // 验证迁移结果
      const migratedItems = await indexedDBStorage.getItems();
      const migratedTasks = await indexedDBStorage.getTasks();
      
      if (migratedItems.length !== result.itemsMigrated) {
        result.warnings.push(`项目数量不匹配: 预期 ${result.itemsMigrated}, 实际 ${migratedItems.length}`);
      }
      
      if (migratedTasks.length !== result.tasksMigrated) {
        result.warnings.push(`任务数量不匹配: 预期 ${result.tasksMigrated}, 实际 ${migratedTasks.length}`);
      }

      // 清理localStorage（如果需要）
      if (options.clearLocalStorageAfter && result.errors.length === 0) {
        try {
          localStorage.removeItem(StorageManager['STORAGE_KEY']);
          localStorage.removeItem(StorageManager['SCHEDULED_TASKS_KEY']);
          console.log('已清理localStorage中的旧数据');
        } catch (error) {
          result.warnings.push(`清理localStorage失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      // 完成
      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      this.updateProgress({
        stage: 'completed',
        progress: 100,
        message: result.success ? '迁移完成!' : '迁移完成，但有错误',
        itemsProcessed: result.itemsMigrated,
        tasksProcessed: result.tasksMigrated,
        totalItems: localItems.length,
        totalTasks: localTasks.length
      });

      console.log('存储迁移完成:', result);
      return result;

    } catch (error) {
      const errorMsg = `迁移过程中发生严重错误: ${error instanceof Error ? error.message : '未知错误'}`;
      result.errors.push(errorMsg);
      result.success = false;
      result.duration = Date.now() - startTime;
      
      console.error('存储迁移失败:', error);
      return result;
    } finally {
      this.migrationInProgress = false;
      this.progressCallback = undefined;
    }
  }

  /**
   * 验证和清理项目数据
   */
  private validateAndCleanItems(items: TMDBItem[]): TMDBItem[] {
    const validItems: TMDBItem[] = [];
    
    for (const item of items) {
      try {
        // 基本字段验证
        if (!item.id || !item.title || !item.mediaType || !item.tmdbId) {
          console.warn('项目缺少必需字段:', item);
          continue;
        }

        // 数据类型验证
        if (typeof item.id !== 'string' || typeof item.title !== 'string') {
          console.warn('项目字段类型错误:', item);
          continue;
        }

        if (!['movie', 'tv'].includes(item.mediaType)) {
          console.warn('项目媒体类型无效:', item);
          continue;
        }

        // 清理和标准化数据
        const cleanedItem: TMDBItem = {
          ...item,
          id: item.id.trim(),
          title: item.title.trim(),
          originalTitle: item.originalTitle?.trim(),
          overview: item.overview?.trim(),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 确保数值字段的正确性
        if (typeof cleanedItem.weekday === 'number') {
          cleanedItem.weekday = Math.max(0, Math.min(6, Math.floor(cleanedItem.weekday)));
        }

        if (typeof cleanedItem.voteAverage === 'number') {
          cleanedItem.voteAverage = Math.max(0, Math.min(10, cleanedItem.voteAverage));
        }

        validItems.push(cleanedItem);
      } catch (error) {
        console.warn('验证项目数据时出错:', error, item);
      }
    }

    return validItems;
  }

  /**
   * 验证和清理任务数据
   */
  private validateAndCleanTask(task: ScheduledTask): ScheduledTask | null {
    try {
      // 基本字段验证
      if (!task.id || !task.name || !task.itemId) {
        console.warn('任务缺少必需字段:', task);
        return null;
      }

      // 调度配置验证
      if (!task.schedule || !task.schedule.type) {
        console.warn('任务缺少调度配置:', task);
        return null;
      }

      if (!['daily', 'weekly'].includes(task.schedule.type)) {
        console.warn('任务调度类型无效:', task);
        return null;
      }

      // 执行动作验证
      if (!task.action) {
        console.warn('任务缺少执行动作:', task);
        return null;
      }

      // 清理和标准化数据
      const cleanedTask: ScheduledTask = {
        ...task,
        id: task.id.trim(),
        name: task.name.trim(),
        itemId: task.itemId.trim(),
        itemTitle: task.itemTitle?.trim() || '',
        type: 'tmdb-import',
        schedule: {
          ...task.schedule,
          hour: Math.max(0, Math.min(23, Math.floor(task.schedule.hour || 0))),
          minute: Math.max(0, Math.min(59, Math.floor(task.schedule.minute || 0)))
        },
        action: {
          ...task.action,
          seasonNumber: Math.max(1, Math.floor(task.action.seasonNumber || 1))
        },
        enabled: Boolean(task.enabled),
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 验证调度配置的具体值
      if (cleanedTask.schedule.type === 'weekly') {
        if (typeof cleanedTask.schedule.dayOfWeek !== 'number' || 
            cleanedTask.schedule.dayOfWeek < 0 || 
            cleanedTask.schedule.dayOfWeek > 6) {
          cleanedTask.schedule.dayOfWeek = 1; // 默认周一
        }
      }

      return cleanedTask;
    } catch (error) {
      console.warn('验证任务数据时出错:', error, task);
      return null;
    }
  }

  /**
   * 更新进度
   */
  private updateProgress(progress: MigrationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * 回滚迁移（从备份恢复）
   */
  async rollback(backupKey: string): Promise<{
    success: boolean;
    message: string;
    itemsRestored: number;
    tasksRestored: number;
  }> {
    try {
      console.log(`开始回滚迁移，使用备份: ${backupKey}`);

      // 获取备份数据
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('备份数据不存在');
      }

      const backup = JSON.parse(backupData);
      if (!backup.items || !backup.tasks) {
        throw new Error('备份数据格式无效');
      }

      // 清空IndexedDB
      await indexedDBStorage.clearAll();

      // 恢复到localStorage
      localStorage.setItem(StorageManager['STORAGE_KEY'], JSON.stringify(backup.items));
      localStorage.setItem(StorageManager['SCHEDULED_TASKS_KEY'], JSON.stringify(backup.tasks));

      console.log(`回滚完成: 恢复了 ${backup.items.length} 个项目和 ${backup.tasks.length} 个任务`);

      return {
        success: true,
        message: '回滚成功',
        itemsRestored: backup.items.length,
        tasksRestored: backup.tasks.length
      };
    } catch (error) {
      const errorMsg = `回滚失败: ${error instanceof Error ? error.message : '未知错误'}`;
      console.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        itemsRestored: 0,
        tasksRestored: 0
      };
    }
  }

  /**
   * 获取可用的备份列表
   */
  getAvailableBackups(): Array<{
    key: string;
    timestamp: string;
    itemCount: number;
    taskCount: number;
  }> {
    const backups: Array<{
      key: string;
      timestamp: string;
      itemCount: number;
      taskCount: number;
    }> = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tmdb_helper_backup_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const backup = JSON.parse(data);
              backups.push({
                key,
                timestamp: backup.timestamp || '未知',
                itemCount: backup.items?.length || 0,
                taskCount: backup.tasks?.length || 0
              });
            }
          } catch (error) {
            console.warn(`解析备份 ${key} 失败:`, error);
          }
        }
      }
    } catch (error) {
      console.error('获取备份列表失败:', error);
    }

    // 按时间戳排序（最新的在前）
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * 删除备份
   */
  deleteBackup(backupKey: string): boolean {
    try {
      localStorage.removeItem(backupKey);
      console.log(`已删除备份: ${backupKey}`);
      return true;
    } catch (error) {
      console.error(`删除备份失败: ${backupKey}`, error);
      return false;
    }
  }
}

// 导出单例实例
export const storageMigration = StorageMigration.getInstance();