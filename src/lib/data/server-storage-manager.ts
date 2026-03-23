import type { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';
import { initializeStorage } from './server-storage-service';
import { itemsRepository } from '@/lib/database/repositories/items.repository';

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
    const result = itemsRepository.update(item.id, item);
    return result.success;
  }

  /**
   * 删除项目
   */
  static deleteItem(id: string): boolean {
    ensureInitializedSync();
    const result = itemsRepository.softDelete(id);
    return result.success;
  }

  /**
   * 导出数据
   */
  static exportData(): { items: TMDBItem[] } {
    ensureInitializedSync();
    try {
      const items = itemsRepository.findAllWithRelations();
      return { items };
    } catch (error) {
      logger.error('ServerStorageManager', '导出数据失败', error);
      return { items: [] };
    }
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
