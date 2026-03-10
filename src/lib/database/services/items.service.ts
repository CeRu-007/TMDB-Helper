/**
 * 媒体项目 Service
 * 提供业务逻辑和缓存功能
 */

import { itemsRepository } from '../repositories/items.repository';
import { cacheManager, CacheKeys } from './cache.service';
import type { TMDBItem } from '@/types/tmdb-item';
import type { DatabaseResult } from '../types';
import { logger } from '@/lib/utils/logger';

export class ItemsService {
  private static instance: ItemsService;

  private constructor() {}

  static getInstance(): ItemsService {
    if (!ItemsService.instance) {
      ItemsService.instance = new ItemsService();
    }
    return ItemsService.instance;
  }

  /**
   * 获取所有项目（带缓存）
   */
  getAll(): TMDBItem[] {
    const cacheKey = CacheKeys.items.all;
    const cached = cacheManager.get<TMDBItem[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const items = itemsRepository.findAllWithRelations();
    cacheManager.set(cacheKey, items, 60 * 1000); // 1分钟缓存
    return items;
  }

  /**
   * 根据ID获取项目（带缓存）
   */
  getById(id: string): TMDBItem | undefined {
    const cacheKey = CacheKeys.items.byId(id);
    const cached = cacheManager.get<TMDBItem>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const item = itemsRepository.findByIdWithRelations(id);
    if (item) {
      cacheManager.set(cacheKey, item, 60 * 1000);
    }
    return item;
  }

  /**
   * 根据TMDB ID获取项目（带缓存）
   */
  getByTmdbId(tmdbId: string): TMDBItem | undefined {
    const cacheKey = CacheKeys.items.byTmdbId(tmdbId);
    const cached = cacheManager.get<TMDBItem>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const item = itemsRepository.findByTmdbId(tmdbId);
    if (item) {
      cacheManager.set(cacheKey, item, 60 * 1000);
    }
    return item;
  }

  /**
   * 根据播出日获取项目（带缓存）
   */
  getByWeekday(weekday: number): TMDBItem[] {
    const cacheKey = CacheKeys.items.byWeekday(weekday);
    const cached = cacheManager.get<TMDBItem[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const items = itemsRepository.findByWeekday(weekday);
    cacheManager.set(cacheKey, items, 60 * 1000);
    return items;
  }

  /**
   * 创建项目
   */
  create(item: TMDBItem): DatabaseResult<TMDBItem> {
    const result = itemsRepository.create(item);
    
    if (result.success) {
      this.invalidateCache();
      logger.info(`[ItemsService] 创建项目: ${item.title}`);
    }
    
    return result;
  }

  /**
   * 更新项目
   */
  update(item: TMDBItem): DatabaseResult<TMDBItem> {
    const result = itemsRepository.update(item);
    
    if (result.success) {
      this.invalidateCache(item.id);
      logger.info(`[ItemsService] 更新项目: ${item.title}`);
    }
    
    return result;
  }

  /**
   * 保存项目（创建或更新）
   */
  save(item: TMDBItem): DatabaseResult<TMDBItem> {
    const existing = itemsRepository.findById(item.id);
    
    if (existing) {
      return this.update(item);
    }
    
    return this.create(item);
  }

  /**
   * 删除项目（软删除）
   */
  delete(id: string): DatabaseResult {
    const result = itemsRepository.softDelete(id);
    
    if (result.success) {
      this.invalidateCache(id);
      logger.info(`[ItemsService] 删除项目: ${id}`);
    }
    
    return result;
  }

  /**
   * 恢复已删除的项目
   */
  restore(id: string): DatabaseResult {
    const result = itemsRepository.restore(id);
    
    if (result.success) {
      this.invalidateCache(id);
      logger.info(`[ItemsService] 恢复项目: ${id}`);
    }
    
    return result;
  }

  /**
   * 永久删除项目
   */
  hardDelete(id: string): DatabaseResult {
    const result = itemsRepository.deleteById(id);
    
    if (result.success) {
      this.invalidateCache(id);
      logger.info(`[ItemsService] 永久删除项目: ${id}`);
    }
    
    return result;
  }

  /**
   * 批量导入项目
   */
  import(items: TMDBItem[]): DatabaseResult<{ imported: number; skipped: number }> {
    const result = itemsRepository.importItems(items);
    
    if (result.success) {
      this.invalidateCache();
      logger.info(`[ItemsService] 导入项目: ${result.data?.imported} 个`);
    }
    
    return result;
  }

  /**
   * 获取已删除的项目
   */
  getDeleted(): TMDBItem[] {
    return itemsRepository.findDeleted();
  }

  /**
   * 获取项目数量
   */
  getCount(): number {
    return itemsRepository.getItemCount();
  }

  /**
   * 检查项目是否存在
   */
  exists(id: string): boolean {
    return !!this.getById(id);
  }

  /**
   * 使缓存失效
   */
  private invalidateCache(itemId?: string): void {
    cacheManager.delete(CacheKeys.items.all);
    
    if (itemId) {
      cacheManager.delete(CacheKeys.items.byId(itemId));
      // 清除所有 weekday 缓存
      cacheManager.clearPattern('items:weekday:');
    }
  }
}

// 导出单例
export const itemsService = ItemsService.getInstance();
