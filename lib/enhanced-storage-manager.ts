/**
 * 增强存储管理器
 * 整合IndexedDB存储和网络优化功能，提供统一的数据管理接口
 */

import { TMDBItem, ScheduledTask, StorageManager } from './storage';
import { indexedDBStorage } from './indexed-db-storage';
import { networkOptimizer, tmdbNetworkOptimizer } from './network-optimizer';
import { dockerStorageAdapter } from './docker-storage-adapter';

interface SyncOptions {
  forceRefresh?: boolean;
  batchSize?: number;
  priority?: 'low' | 'normal' | 'high';
}

interface StorageStats {
  items: number;
  tasks: number;
  cacheEntries: number;
  totalCacheSize: number;
  dbSize: number;
  networkStats: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
}

export class EnhancedStorageManager {
  private static instance: EnhancedStorageManager;
  private isIndexedDBAvailable = false;
  private fallbackToLocalStorage = false;

  private constructor() {
    this.initializeStorage();
    this.initializeDockerSupport();
  }

  static getInstance(): EnhancedStorageManager {
    if (!EnhancedStorageManager.instance) {
      EnhancedStorageManager.instance = new EnhancedStorageManager();
    }
    return EnhancedStorageManager.instance;
  }

  /**
   * 初始化存储系统
   */
  private async initializeStorage(): Promise<void> {
    try {
      // 根据Docker环境调整存储配置
      const storageConfig = dockerStorageAdapter.getStorageConfig();
      
      if (storageConfig.useIndexedDB) {
        await indexedDBStorage.init();
        this.isIndexedDBAvailable = true;
        console.log('增强存储管理器: IndexedDB初始化成功');
      } else {
        console.log('增强存储管理器: Docker环境中跳过IndexedDB初始化');
        this.fallbackToLocalStorage = true;
      }
      
      // 预加载热门内容
      await this.preloadPopularContent();
    } catch (error) {
      console.warn('增强存储管理器: IndexedDB初始化失败，将使用localStorage作为后备:', error);
      this.fallbackToLocalStorage = true;
    }
  }

  /**
   * 初始化Docker支持
   */
  private async initializeDockerSupport(): Promise<void> {
    try {
      const env = dockerStorageAdapter.getEnvironment();
      console.log('增强存储管理器: Docker环境检测结果:', {
        isDocker: env.isDocker,
        hasWritePermission: env.hasWritePermission,
        dataPath: env.dataPath
      });

      if (env.isDocker) {
        // 在Docker环境中创建必要的目录
        await dockerStorageAdapter.ensureDirectories();
        
        // 检查存储健康状态
        const health = await dockerStorageAdapter.checkStorageHealth();
        if (health.status === 'error') {
          console.error('增强存储管理器: Docker存储健康检查失败:', health.recommendations);
        } else {
          console.log('增强存储管理器: Docker存储健康检查通过');
        }

        // 应用Docker特定的网络配置
        const networkConfig = dockerStorageAdapter.getNetworkConfig();
        console.log('增强存储管理器: 应用Docker网络配置:', networkConfig);
      }
    } catch (error) {
      console.warn('增强存储管理器: Docker支持初始化失败:', error);
    }
  }

  /**
   * 预加载热门内容
   */
  private async preloadPopularContent(): Promise<void> {
    try {
      await tmdbNetworkOptimizer.preloadPopularContent();
      console.log('增强存储管理器: 热门内容预加载完成');
    } catch (error) {
      console.warn('增强存储管理器: 预加载失败:', error);
    }
  }

  // ===== 项目管理 =====

  /**
   * 获取所有项目（优化版）
   */
  async getItems(options: SyncOptions = {}): Promise<TMDBItem[]> {
    try {
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        const items = await indexedDBStorage.getItems();
        
        // 如果强制刷新或没有数据，尝试从网络同步
        if (options.forceRefresh || items.length === 0) {
          await this.syncItemsFromNetwork(options);
          return await indexedDBStorage.getItems();
        }
        
        return items;
      } else {
        // 回退到原始存储管理器
        return await StorageManager.getItemsWithRetry();
      }
    } catch (error) {
      console.error('增强存储管理器: 获取项目失败:', error);
      // 回退到原始方法
      return await StorageManager.getItemsWithRetry();
    }
  }

  /**
   * 根据条件查询项目
   */
  async queryItems(filter: {
    mediaType?: 'movie' | 'tv';
    category?: string;
    status?: 'ongoing' | 'completed';
    weekday?: number;
    search?: string;
  }): Promise<TMDBItem[]> {
    try {
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        let items = await indexedDBStorage.queryItems(filter);
        
        // 如果有搜索条件，进行文本搜索
        if (filter.search) {
          const searchTerm = filter.search.toLowerCase();
          items = items.filter(item => 
            item.title.toLowerCase().includes(searchTerm) ||
            item.originalTitle?.toLowerCase().includes(searchTerm) ||
            item.overview?.toLowerCase().includes(searchTerm)
          );
        }
        
        return items;
      } else {
        // 回退到基础查询
        const allItems = await this.getItems();
        return allItems.filter(item => {
          if (filter.mediaType && item.mediaType !== filter.mediaType) return false;
          if (filter.category && item.category !== filter.category) return false;
          if (filter.status && item.status !== filter.status) return false;
          if (filter.weekday !== undefined && item.weekday !== filter.weekday) return false;
          if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            return item.title.toLowerCase().includes(searchTerm) ||
                   item.originalTitle?.toLowerCase().includes(searchTerm) ||
                   item.overview?.toLowerCase().includes(searchTerm);
          }
          return true;
        });
      }
    } catch (error) {
      console.error('增强存储管理器: 查询项目失败:', error);
      return [];
    }
  }

  /**
   * 添加项目（优化版）
   */
  async addItem(item: TMDBItem): Promise<boolean> {
    try {
      // 同时保存到IndexedDB和原始存储
      const promises: Promise<boolean>[] = [];
      
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        promises.push(
          indexedDBStorage.saveItem(item).then(() => true).catch(() => false)
        );
      }
      
      promises.push(StorageManager.addItem(item));
      
      const results = await Promise.allSettled(promises);
      const success = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      if (success) {
        console.log(`增强存储管理器: 项目添加成功 - ${item.title}`);
        
        // 异步获取并缓存TMDB详细信息
        this.enrichItemWithTMDBData(item).catch(error => {
          console.warn('增强存储管理器: 获取TMDB详细信息失败:', error);
        });
      }
      
      return success;
    } catch (error) {
      console.error('增强存储管理器: 添加项目失败:', error);
      return false;
    }
  }

  /**
   * 更新项目（优化版）
   */
  async updateItem(item: TMDBItem): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        promises.push(
          indexedDBStorage.saveItem(item).then(() => true).catch(() => false)
        );
      }
      
      promises.push(StorageManager.updateItem(item));
      
      const results = await Promise.allSettled(promises);
      const success = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      if (success) {
        console.log(`增强存储管理器: 项目更新成功 - ${item.title}`);
      }
      
      return success;
    } catch (error) {
      console.error('增强存储管理器: 更新项目失败:', error);
      return false;
    }
  }

  /**
   * 删除项目（优化版）
   */
  async deleteItem(id: string): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        promises.push(
          indexedDBStorage.deleteItem(id).then(() => true).catch(() => false)
        );
      }
      
      promises.push(StorageManager.deleteItem(id));
      
      const results = await Promise.allSettled(promises);
      const success = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      if (success) {
        console.log(`增强存储管理器: 项目删除成功 - ID: ${id}`);
      }
      
      return success;
    } catch (error) {
      console.error('增强存储管理器: 删除项目失败:', error);
      return false;
    }
  }

  /**
   * 批量操作项目
   */
  async batchUpdateItems(items: TMDBItem[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        // 使用IndexedDB批量保存
        await indexedDBStorage.saveItems(items);
        results.success = items.length;
      } else {
        // 逐个更新
        for (const item of items) {
          try {
            const success = await this.updateItem(item);
            if (success) {
              results.success++;
            } else {
              results.failed++;
              results.errors.push(`更新项目失败: ${item.title}`);
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`更新项目异常: ${item.title} - ${error}`);
          }
        }
      }
    } catch (error) {
      results.failed = items.length;
      results.errors.push(`批量更新失败: ${error}`);
    }

    console.log(`增强存储管理器: 批量更新完成 - 成功: ${results.success}, 失败: ${results.failed}`);
    return results;
  }

  // ===== 任务管理 =====

  /**
   * 获取所有任务（优化版）
   */
  async getTasks(): Promise<ScheduledTask[]> {
    try {
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        return await indexedDBStorage.getTasks();
      } else {
        return await StorageManager.getScheduledTasks();
      }
    } catch (error) {
      console.error('增强存储管理器: 获取任务失败:', error);
      return await StorageManager.getScheduledTasks();
    }
  }

  /**
   * 保存任务（优化版）
   */
  async saveTask(task: ScheduledTask): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        promises.push(
          indexedDBStorage.saveTask(task).then(() => true).catch(() => false)
        );
      }
      
      promises.push(StorageManager.updateScheduledTask(task));
      
      const results = await Promise.allSettled(promises);
      const success = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      return success;
    } catch (error) {
      console.error('增强存储管理器: 保存任务失败:', error);
      return false;
    }
  }

  /**
   * 删除任务（优化版）
   */
  async deleteTask(id: string): Promise<boolean> {
    try {
      const promises: Promise<boolean>[] = [];
      
      if (this.isIndexedDBAvailable && !this.fallbackToLocalStorage) {
        promises.push(
          indexedDBStorage.deleteTask(id).then(() => true).catch(() => false)
        );
      }
      
      promises.push(StorageManager.deleteScheduledTask(id));
      
      const results = await Promise.allSettled(promises);
      const success = results.some(result => 
        result.status === 'fulfilled' && result.value === true
      );
      
      return success;
    } catch (error) {
      console.error('增强存储管理器: 删除任务失败:', error);
      return false;
    }
  }

  // ===== TMDB数据增强 =====

  /**
   * 使用TMDB数据增强项目信息
   */
  private async enrichItemWithTMDBData(item: TMDBItem): Promise<void> {
    try {
      const details = await tmdbNetworkOptimizer.getTVDetails(item.tmdbId, {
        appendToResponse: ['images', 'credits', 'keywords']
      });

      // 更新项目信息
      const enrichedItem: TMDBItem = {
        ...item,
        overview: details.overview || item.overview,
        voteAverage: details.vote_average || item.voteAverage,
        posterPath: details.poster_path || item.posterPath,
        backdropPath: details.backdrop_path || item.backdropPath,
        // 可以添加更多字段
        updatedAt: new Date().toISOString()
      };

      // 异步更新，不影响主流程
      await this.updateItem(enrichedItem);
      console.log(`增强存储管理器: TMDB数据增强完成 - ${item.title}`);
    } catch (error) {
      console.warn(`增强存储管理器: TMDB数据增强失败 - ${item.title}:`, error);
    }
  }

  /**
   * 批量增强项目数据
   */
  async enrichItemsWithTMDBData(items: TMDBItem[]): Promise<void> {
    console.log(`增强存储管理器: 开始批量增强 ${items.length} 个项目的TMDB数据`);
    
    const batchItems = items.map(item => ({
      id: item.tmdbId,
      type: item.mediaType
    }));

    try {
      const detailsArray = await tmdbNetworkOptimizer.batchGetDetails(batchItems);
      
      const enrichedItems: TMDBItem[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const details = detailsArray[i];
        
        if (details) {
          const enrichedItem: TMDBItem = {
            ...item,
            overview: details.overview || item.overview,
            voteAverage: details.vote_average || item.voteAverage,
            posterPath: details.poster_path || item.posterPath,
            backdropPath: details.backdrop_path || item.backdropPath,
            updatedAt: new Date().toISOString()
          };
          enrichedItems.push(enrichedItem);
        }
      }
      
      if (enrichedItems.length > 0) {
        await this.batchUpdateItems(enrichedItems);
        console.log(`增强存储管理器: 批量TMDB数据增强完成 - ${enrichedItems.length} 个项目`);
      }
    } catch (error) {
      console.error('增强存储管理器: 批量TMDB数据增强失败:', error);
    }
  }

  // ===== 搜索功能 =====

  /**
   * 智能搜索（本地+网络）
   */
  async smartSearch(query: string, options: {
    mediaType?: 'movie' | 'tv';
    searchLocal?: boolean;
    searchNetwork?: boolean;
    limit?: number;
  } = {}): Promise<{
    local: TMDBItem[];
    network: any[];
    total: number;
  }> {
    const {
      mediaType,
      searchLocal = true,
      searchNetwork = true,
      limit = 20
    } = options;

    const results = {
      local: [] as TMDBItem[],
      network: [] as any[],
      total: 0
    };

    try {
      // 本地搜索
      if (searchLocal) {
        const queryFilter: {
          search: string;
          mediaType?: 'movie' | 'tv';
        } = { search: query };
        
        if (mediaType) {
          queryFilter.mediaType = mediaType;
        }
        
        results.local = await this.queryItems(queryFilter);
      }

      // 网络搜索
      if (searchNetwork) {
        const networkPromises: Promise<any>[] = [];
        
        if (!mediaType || mediaType === 'movie') {
          networkPromises.push(tmdbNetworkOptimizer.searchMovie(query));
        }
        
        if (!mediaType || mediaType === 'tv') {
          networkPromises.push(tmdbNetworkOptimizer.searchTV(query));
        }

        const networkResults = await Promise.allSettled(networkPromises);
        
        networkResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value?.results) {
            results.network.push(...result.value.results);
          }
        });

        // 去重和限制数量
        const seenIds = new Set();
        results.network = results.network
          .filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          })
          .slice(0, limit);
      }

      results.total = results.local.length + results.network.length;
      
      console.log(`增强存储管理器: 智能搜索完成 - 本地: ${results.local.length}, 网络: ${results.network.length}`);
      return results;
    } catch (error) {
      console.error('增强存储管理器: 智能搜索失败:', error);
      return results;
    }
  }

  // ===== 数据同步 =====

  /**
   * 从网络同步项目数据
   */
  private async syncItemsFromNetwork(options: SyncOptions = {}): Promise<void> {
    try {
      console.log('增强存储管理器: 开始从网络同步项目数据');
      
      // 这里可以实现从服务器API同步数据的逻辑
      // 目前暂时跳过，因为主要是本地存储优化
      
      console.log('增强存储管理器: 网络同步完成');
    } catch (error) {
      console.error('增强存储管理器: 网络同步失败:', error);
    }
  }

  // ===== 数据导入导出 =====

  /**
   * 导出数据（优化版）
   */
  async exportData(): Promise<string> {
    try {
      const [items, tasks] = await Promise.all([
        this.getItems(),
        this.getTasks()
      ]);

      const exportData = {
        items,
        tasks,
        version: "2.0.0",
        exportDate: new Date().toISOString(),
        storageType: this.isIndexedDBAvailable ? 'indexeddb' : 'localstorage'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('增强存储管理器: 导出数据失败:', error);
      throw error;
    }
  }

  /**
   * 导入数据（优化版）
   */
  async importData(jsonData: string): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      itemsImported: number;
      tasksImported: number;
      itemsSkipped: number;
      tasksSkipped: number;
    };
  }> {
    try {
      const validation = StorageManager.validateImportData(jsonData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const { items, tasks } = validation.data!;
      
      // 批量导入项目
      const itemResult = await this.batchUpdateItems(items);
      
      // 导入任务
      let tasksImported = 0;
      for (const task of tasks) {
        try {
          const success = await this.saveTask(task);
          if (success) tasksImported++;
        } catch (error) {
          console.warn('增强存储管理器: 导入任务失败:', error);
        }
      }

      console.log('增强存储管理器: 数据导入完成');
      return {
        success: true,
        stats: {
          itemsImported: itemResult.success,
          tasksImported,
          itemsSkipped: itemResult.failed,
          tasksSkipped: tasks.length - tasksImported
        }
      };
    } catch (error) {
      console.error('增强存储管理器: 导入数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入过程中发生未知错误'
      };
    }
  }

  // ===== 统计和监控 =====

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const [dbStats, networkStats] = await Promise.all([
        this.isIndexedDBAvailable ? indexedDBStorage.getStorageStats() : Promise.resolve({
          items: 0,
          tasks: 0,
          cacheEntries: 0,
          totalCacheSize: 0,
          dbSize: 0
        }),
        Promise.resolve(networkOptimizer.getPerformanceStats())
      ]);

      return {
        ...dbStats,
        networkStats: {
          totalRequests: networkStats.totalRequests,
          successRate: networkStats.successRate,
          averageResponseTime: networkStats.averageResponseTime,
          cacheHitRate: networkStats.cacheHitRate
        }
      };
    } catch (error) {
      console.error('增强存储管理器: 获取统计信息失败:', error);
      return {
        items: 0,
        tasks: 0,
        cacheEntries: 0,
        totalCacheSize: 0,
        dbSize: 0,
        networkStats: {
          totalRequests: 0,
          successRate: 0,
          averageResponseTime: 0,
          cacheHitRate: 0
        }
      };
    }
  }

  /**
   * 清理存储
   */
  async cleanup(): Promise<void> {
    try {
      console.log('增强存储管理器: 开始清理存储');
      
      if (this.isIndexedDBAvailable) {
        await indexedDBStorage.cleanupCache();
      }
      
      await networkOptimizer.clearCache();
      
      console.log('增强存储管理器: 存储清理完成');
    } catch (error) {
      console.error('增强存储管理器: 清理存储失败:', error);
    }
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: {
      indexedDB: boolean;
      localStorage: boolean;
      networkOptimizer: boolean;
      lastError?: string;
    };
  }> {
    const details = {
      indexedDB: this.isIndexedDBAvailable,
      localStorage: StorageManager.isStorageAvailable(),
      networkOptimizer: true,
      lastError: undefined as string | undefined
    };

    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // 测试IndexedDB
      if (this.isIndexedDBAvailable) {
        await indexedDBStorage.getStorageStats();
      }

      // 测试localStorage
      if (!details.localStorage) {
        status = 'warning';
        details.lastError = 'localStorage不可用';
      }

      // 如果IndexedDB和localStorage都不可用
      if (!details.indexedDB && !details.localStorage) {
        status = 'error';
        details.lastError = '所有存储方式都不可用';
      }
    } catch (error) {
      status = 'error';
      details.lastError = error instanceof Error ? error.message : '健康检查失败';
    }

    return { status, details };
  }
}

// 导出单例实例
export const enhancedStorageManager = EnhancedStorageManager.getInstance();

// 向后兼容的导出
export { EnhancedStorageManager as StorageManager };