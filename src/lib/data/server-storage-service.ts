/**
 * 服务器端数据库存储服务
 * 基于 SQLite 的存储实现，替代原有的文件存储
 */

import { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';
import { initializeDatabase } from '@/lib/database';
import { checkAndMigrate } from '@/lib/database/migrations/json-to-sqlite';
import { itemsRepository } from '@/lib/database/repositories/items.repository';
import type { DatabaseResult } from './database/types';

// 初始化标志
let initialized = false;

/**
 * 初始化数据库并执行迁移
 */
export async function initializeStorage(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    // 初始化数据库（现在需要 await）
    await initializeDatabase();

    // 检查并执行迁移
    await checkAndMigrate();

    initialized = true;
    logger.info('[ServerStorageService] 数据库存储服务已初始化');
  } catch (error) {
    logger.error('[ServerStorageService] 初始化失败:', error);
    throw error;
  }
}

/**
 * 服务器端数据库存储服务
 * 只在服务器端运行，处理数据库操作
 */
export class ServerStorageService {
  private static readonly ADMIN_USER_ID = 'user_admin_system';

  /**
   * 确保数据库已初始化
   */
  private static ensureInitialized(): void {
    if (!initialized) {
      initializeDatabase();
      initialized = true;
    }
  }

  /**
   * 从数据库读取所有项目
   */
  static readItemsFromFile(): TMDBItem[] {
    try {
      this.ensureInitialized();
      return itemsRepository.findAllWithRelations();
    } catch (error) {
      logger.error('[ServerStorageService] 读取项目失败:', error);
      return [];
    }
  }

  /**
   * 将所有项目写入数据库
   */
  static writeItemsToFile(items: TMDBItem[]): boolean {
    try {
      this.ensureInitialized();

      // 清除现有数据
      itemsRepository.clear();

      // 批量导入
      for (const item of items) {
        itemsRepository.create(item);
      }

      logger.info(`[ServerStorageService] 成功写入 ${items.length} 个词条到数据库`);
      return true;
    } catch (error) {
      logger.error('[ServerStorageService] 写入数据到数据库失败:', error);
      return false;
    }
  }

  /**
   * 添加单个项目到数据库
   */
  static addItemToFile(item: TMDBItem): boolean {
    try {
      this.ensureInitialized();

      const existing = itemsRepository.findByIdWithRelations(item.id);
      if (existing) {
        // 更新现有项目
        const result = itemsRepository.update(item);
        if (result.success) {
          logger.info(`[ServerStorageService] 成功更新项目: ${item.title}`);
        }
        return result.success;
      } else {
        // 添加新项目
        const result = itemsRepository.create(item);
        if (result.success) {
          logger.info(`[ServerStorageService] 成功添加项目: ${item.title}`);
        }
        return result.success;
      }
    } catch (error) {
      logger.error('[ServerStorageService] 添加项目失败:', error);
      return false;
    }
  }

  /**
   * 更新单个项目到数据库
   */
  static updateItemToFile(item: TMDBItem): boolean {
    try {
      this.ensureInitialized();

      const result = itemsRepository.update(item);
      if (result.success) {
        logger.info(`[ServerStorageService] 成功更新项目: ${item.title}`);
      }
      return result.success;
    } catch (error) {
      logger.error('[ServerStorageService] 更新项目失败:', error);
      return false;
    }
  }

  /**
   * 从数据库删除单个项目
   */
  static deleteItemFromFile(id: string): boolean {
    try {
      this.ensureInitialized();

      const result = itemsRepository.deleteById(id);
      if (result.success) {
        logger.info(`[ServerStorageService] 成功删除项目ID: ${id}`);
      }
      return result.success;
    } catch (error) {
      logger.error('[ServerStorageService] 删除项目失败:', error);
      return false;
    }
  }

  /**
   * 预加载缓存（数据库模式下不需要，保持接口兼容）
   */
  static preloadCache(): void {
    this.ensureInitialized();
    logger.debug('[ServerStorageService] 数据库模式，无需预加载缓存');
  }

  /**
   * 获取当前缓存状态（数据库模式下返回数据库状态）
   */
  static getCacheStatus(): {
    isValid: boolean;
    itemCount: number;
    ageMs: number | null;
  } {
    this.ensureInitialized();
    const count = itemsRepository.getItemCount();
    return {
      isValid: true,
      itemCount: count,
      ageMs: null,
    };
  }

  /**
   * 批量导入项目
   */
  static importItems(items: TMDBItem[]): DatabaseResult<{ imported: number; skipped: number }> {
    this.ensureInitialized();
    return itemsRepository.importItems(items);
  }

  /**
   * 根据 ID 获取项目
   */
  static getItemById(id: string): TMDBItem | undefined {
    this.ensureInitialized();
    return itemsRepository.findByIdWithRelations(id);
  }

  /**
   * 根据 TMDB ID 获取项目
   */
  static getItemByTmdbId(tmdbId: string): TMDBItem | undefined {
    this.ensureInitialized();
    return itemsRepository.findByTmdbId(tmdbId);
  }

  /**
   * 获取项目总数
   */
  static getItemCount(): number {
    this.ensureInitialized();
    return itemsRepository.getItemCount();
  }
}