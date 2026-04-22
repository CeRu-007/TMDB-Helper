import type { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';
import { initializeStorage } from './server-storage-service';
import { itemsRepository } from '@/lib/database/repositories/items.repository';
import type { DatabaseResult } from './database/types';

// 初始化标志
let initialized = false;

/**
 * 确保数据库已初始化（异步）
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
  static async getItems(): Promise<TMDBItem[]> {
    await ensureInitialized();
    return itemsRepository.findAllWithRelations();
  }

  /**
   * 添加项目
   */
  static async addItem(item: TMDBItem): Promise<boolean> {
    await ensureInitialized();
    const result = itemsRepository.create(item);
    return result.success;
  }

  /**
   * 更新项目
   */
  static async updateItem(item: TMDBItem): Promise<boolean> {
    await ensureInitialized();
    const result = itemsRepository.update(item);
    return result.success;
  }

  /**
   * 删除项目
   */
  static async deleteItem(id: string): Promise<boolean> {
    await ensureInitialized();
    const result = itemsRepository.softDelete(id);
    return result.success;
  }

  /**
   * 导出数据
   */
  static async exportData(): Promise<{ items: TMDBItem[] }> {
    await ensureInitialized();
    try {
      const items = itemsRepository.findAllWithRelations();
      return { items };
    } catch (error) {
      logger.error('ServerStorageManager', '导出数据失败', error);
      return { items: [] };
    }
  }

  /**
   * 导入数据
   */
  static async importData(items: TMDBItem[]): Promise<boolean> {
    await ensureInitialized();
    try {
      const result = itemsRepository.importItems(items);
      return result.success;
    } catch (error) {
      logger.error('ServerStorageManager', '导入数据失败', error);
      return false;
    }
  }

  /**
   * 清空所有项目
   */
  static async clearAllItems(): Promise<boolean> {
    await ensureInitialized();
    try {
      itemsRepository.clear();
      return true;
    } catch (error) {
      logger.error('ServerStorageManager', '清空数据失败', error);
      return false;
    }
  }

  /**
   * 根据 ID 获取项目
   */
  static async getItemById(id: string): Promise<TMDBItem | undefined> {
    await ensureInitialized();
    return itemsRepository.findByIdWithRelations(id);
  }

  /**
   * 获取项目总数
   */
  static async getItemCount(): Promise<number> {
    await ensureInitialized();
    return itemsRepository.getItemCount();
  }

  /**
   * 批量导入项目
   */
  static async importItems(items: TMDBItem[]): Promise<DatabaseResult<{ imported: number; skipped: number }>> {
    await ensureInitialized();
    return itemsRepository.importItems(items);
  }
}
