import type { TMDBItem } from '@/types/tmdb-item';
import type { ScheduledTask } from '@/lib/data/storage/types';
import { logger } from '@/lib/utils/logger';
import { initializeStorage } from './server-storage-service';
import { itemsRepository } from '@/lib/database/repositories/items.repository';
import { tasksRepository } from '@/lib/database/repositories/tasks.repository';

// 初始化标志
let initialized = false;

/**
 * 确保数据库已初始化
 */
async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initializeStorage();
    initialized = true;
  }
}

/**
 * 服务器端存储管理器
 * 基于 SQLite 数据库的存储实现
 */
export class ServerStorageManager {
  /**
   * 初始化存储（应用启动时调用）
   */
  static async init(): Promise<void> {
    await ensureInitialized();
  }

  /**
   * 获取所有项目
   */
  static getItems(): TMDBItem[] {
    ensureInitializedSync();
    return itemsRepository.findAllWithRelations();
  }

  /**
   * 添加项目
   */
  static addItem(item: TMDBItem): boolean {
    ensureInitializedSync();
    const result = itemsRepository.create(item);
    return result.success;
  }

  /**
   * 更新项目
   */
  static updateItem(item: TMDBItem): boolean {
    ensureInitializedSync();
    const result = itemsRepository.update(item);
    return result.success;
  }

  /**
   * 删除项目
   */
  static deleteItem(id: string): boolean {
    ensureInitializedSync();
    const result = itemsRepository.deleteById(id);
    return result.success;
  }

  /**
   * 清空所有项目
   */
  static clearAllItems(): void {
    ensureInitializedSync();
    itemsRepository.clear();
  }

  /**
   * 导入数据
   */
  static importData(items: TMDBItem[]): boolean {
    ensureInitializedSync();
    try {
      itemsRepository.clear();
      const result = itemsRepository.importItems(items);
      return result.success;
    } catch (error) {
      logger.error('ServerStorageManager', '导入数据失败', error);
      return false;
    }
  }

  /**
   * 导出数据
   */
  static exportData(): { items: TMDBItem[]; tasks: ScheduledTask[] } {
    ensureInitializedSync();
    try {
      const items = itemsRepository.findAllWithRelations();
      const tasks = tasksRepository.findAllTasks();
      return { items, tasks };
    } catch (error) {
      logger.error('ServerStorageManager', '导出数据失败', error);
      return { items: [], tasks: [] };
    }
  }

  /**
   * 获取所有定时任务
   */
  static getTasks(): ScheduledTask[] {
    ensureInitializedSync();
    return tasksRepository.findAllTasks();
  }

  /**
   * 添加定时任务
   */
  static addTask(task: ScheduledTask): boolean {
    ensureInitializedSync();
    const result = tasksRepository.createTask(task);
    return result.success;
  }

  /**
   * 更新定时任务
   */
  static updateTask(task: ScheduledTask): boolean {
    ensureInitializedSync();
    const result = tasksRepository.updateTask(task);
    return result.success;
  }

  /**
   * 删除定时任务
   */
  static deleteTask(id: string): boolean {
    ensureInitializedSync();
    const result = tasksRepository.deleteById(id);
    return result.success;
  }

  /**
   * 根据项目ID获取关联的任务
   */
  static getTasksByItemId(itemId: string): ScheduledTask[] {
    ensureInitializedSync();
    return tasksRepository.findByItemId(itemId);
  }

  /**
   * 删除项目关联的所有任务
   */
  static deleteTasksByItemId(itemId: string): number {
    ensureInitializedSync();
    const result = tasksRepository.deleteByItemId(itemId);
    return result.data ?? 0;
  }
}

/**
 * 同步初始化（用于同步方法）
 */
function ensureInitializedSync(): void {
  if (!initialized) {
    initializeStorage();
    initialized = true;
  }
}