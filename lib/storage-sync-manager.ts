/**
 * 存储同步管理器
 * 处理客户端和服务端数据同步，防止数据冲突
 */

import { TMDBItem, ScheduledTask, StorageManager } from './storage';
import { DistributedLock } from './distributed-lock';

export interface SyncStatus {
  lastSyncTime: string;
  clientVersion: number;
  serverVersion: number;
  conflictCount: number;
  syncInProgress: boolean;
}

export interface SyncResult {
  success: boolean;
  itemsUpdated: number;
  tasksUpdated: number;
  conflicts: Array<{
    type: 'item' | 'task';
    id: string;
    clientData: any;
    serverData: any;
    resolution: 'client' | 'server' | 'merge';
  }>;
  error?: string;
}

export class StorageSyncManager {
  private static readonly SYNC_STATUS_KEY = 'tmdb_helper_sync_status';
  private static readonly SYNC_LOCK_KEY = 'storage_sync';
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5分钟同步间隔
  private static readonly CONFLICT_RESOLUTION_TIMEOUT = 30 * 1000; // 30秒冲突解决超时
  
  private static syncTimer: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  /**
   * 初始化同步管理器
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[StorageSyncManager] 初始化存储同步管理器');
    
    try {
      // 启动定期同步
      this.startPeriodicSync();
      
      // 移除页面可见性依赖，同步将通过定期机制进行

      // 页面卸载前进行最后一次同步
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          this.stopPeriodicSync();
        });
      }

      this.isInitialized = true;
      console.log('[StorageSyncManager] 同步管理器初始化完成');
    } catch (error) {
      console.error('[StorageSyncManager] 初始化失败:', error);
    }
  }

  /**
   * 启动定期同步
   */
  private static startPeriodicSync(): void {
    if (this.syncTimer) {
      return;
    }

    this.syncTimer = setInterval(async () => {
      await this.triggerSync();
    }, this.SYNC_INTERVAL);

    console.log(`[StorageSyncManager] 启动定期同步，间隔: ${this.SYNC_INTERVAL / 1000}秒`);
  }

  /**
   * 停止定期同步
   */
  private static stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[StorageSyncManager] 停止定期同步');
    }
  }

  /**
   * 触发同步
   */
  static async triggerSync(): Promise<SyncResult> {
    // 获取同步锁
    const lockResult = await DistributedLock.acquireLock(this.SYNC_LOCK_KEY, 'storage_write', 2 * 60 * 1000);
    
    if (!lockResult.success) {
      console.log(`[StorageSyncManager] 无法获取同步锁: ${lockResult.error}`);
      return {
        success: false,
        itemsUpdated: 0,
        tasksUpdated: 0,
        conflicts: [],
        error: lockResult.error
      };
    }

    try {
      console.log('[StorageSyncManager] 开始数据同步');
      const result = await this.performSync();
      console.log(`[StorageSyncManager] 同步完成: 项目更新${result.itemsUpdated}个, 任务更新${result.tasksUpdated}个, 冲突${result.conflicts.length}个`);
      return result;
    } finally {
      await DistributedLock.releaseLock(this.SYNC_LOCK_KEY);
    }
  }

  /**
   * 执行同步操作
   */
  private static async performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      itemsUpdated: 0,
      tasksUpdated: 0,
      conflicts: []
    };

    try {
      // 更新同步状态
      await this.updateSyncStatus({ syncInProgress: true });

      // 获取客户端数据
      const clientItems = await this.getClientItems();
      const clientTasks = await this.getClientTasks();

      // 获取服务端数据
      const serverData = await this.getServerData();
      
      if (!serverData.success) {
        throw new Error(`获取服务端数据失败: ${serverData.error}`);
      }

      // 同步项目数据
      const itemSyncResult = await this.syncItems(clientItems, serverData.items || []);
      result.itemsUpdated = itemSyncResult.updated;
      result.conflicts.push(...itemSyncResult.conflicts);

      // 同步任务数据
      const taskSyncResult = await this.syncTasks(clientTasks, serverData.tasks || []);
      result.tasksUpdated = taskSyncResult.updated;
      result.conflicts.push(...taskSyncResult.conflicts);

      // 更新版本号
      const status = await this.getSyncStatus();
      await this.updateSyncStatus({
        lastSyncTime: new Date().toISOString(),
        clientVersion: status.clientVersion + 1,
        serverVersion: serverData.version || status.serverVersion,
        conflictCount: status.conflictCount + result.conflicts.length,
        syncInProgress: false
      });

      result.success = true;
      return result;

    } catch (error) {
      console.error('[StorageSyncManager] 同步失败:', error);
      
      // 更新同步状态
      await this.updateSyncStatus({ syncInProgress: false });
      
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * 同步项目数据
   */
  private static async syncItems(clientItems: TMDBItem[], serverItems: TMDBItem[]): Promise<{
    updated: number;
    conflicts: SyncResult['conflicts'];
  }> {
    const conflicts: SyncResult['conflicts'] = [];
    let updated = 0;

    try {
      // 创建映射以便快速查找
      const clientMap = new Map(clientItems.map(item => [item.id, item]));
      const serverMap = new Map(serverItems.map(item => [item.id, item]));

      const mergedItems: TMDBItem[] = [];

      // 处理服务端项目
      for (const serverItem of serverItems) {
        const clientItem = clientMap.get(serverItem.id);
        
        if (!clientItem) {
          // 服务端有，客户端没有 - 添加到客户端
          mergedItems.push(serverItem);
          updated++;
        } else {
          // 两边都有 - 检查冲突
          const resolution = this.resolveItemConflict(clientItem, serverItem);
          
          if (resolution.hasConflict) {
            conflicts.push({
              type: 'item',
              id: serverItem.id,
              clientData: clientItem,
              serverData: serverItem,
              resolution: resolution.resolution
            });
          }

          mergedItems.push(resolution.resolvedItem);
          if (resolution.resolution !== 'client') {
            updated++;
          }
        }
      }

      // 处理客户端独有的项目
      for (const clientItem of clientItems) {
        if (!serverMap.has(clientItem.id)) {
          // 客户端有，服务端没有 - 保留客户端数据
          mergedItems.push(clientItem);
        }
      }

      // 保存合并后的数据
      if (updated > 0) {
        await this.saveClientItems(mergedItems);
      }

      return { updated, conflicts };

    } catch (error) {
      console.error('[StorageSyncManager] 同步项目数据失败:', error);
      return { updated: 0, conflicts: [] };
    }
  }

  /**
   * 同步任务数据
   */
  private static async syncTasks(clientTasks: ScheduledTask[], serverTasks: ScheduledTask[]): Promise<{
    updated: number;
    conflicts: SyncResult['conflicts'];
  }> {
    const conflicts: SyncResult['conflicts'] = [];
    let updated = 0;

    try {
      // 创建映射以便快速查找
      const clientMap = new Map(clientTasks.map(task => [task.id, task]));
      const serverMap = new Map(serverTasks.map(task => [task.id, task]));

      const mergedTasks: ScheduledTask[] = [];

      // 处理服务端任务
      for (const serverTask of serverTasks) {
        const clientTask = clientMap.get(serverTask.id);
        
        if (!clientTask) {
          // 服务端有，客户端没有 - 添加到客户端
          mergedTasks.push(serverTask);
          updated++;
        } else {
          // 两边都有 - 检查冲突
          const resolution = this.resolveTaskConflict(clientTask, serverTask);
          
          if (resolution.hasConflict) {
            conflicts.push({
              type: 'task',
              id: serverTask.id,
              clientData: clientTask,
              serverData: serverTask,
              resolution: resolution.resolution
            });
          }

          mergedTasks.push(resolution.resolvedTask);
          if (resolution.resolution !== 'client') {
            updated++;
          }
        }
      }

      // 处理客户端独有的任务
      for (const clientTask of clientTasks) {
        if (!serverMap.has(clientTask.id)) {
          // 客户端有，服务端没有 - 保留客户端数据
          mergedTasks.push(clientTask);
        }
      }

      // 保存合并后的数据
      if (updated > 0) {
        await this.saveClientTasks(mergedTasks);
      }

      return { updated, conflicts };

    } catch (error) {
      console.error('[StorageSyncManager] 同步任务数据失败:', error);
      return { updated: 0, conflicts: [] };
    }
  }

  /**
   * 解决项目冲突
   */
  private static resolveItemConflict(clientItem: TMDBItem, serverItem: TMDBItem): {
    hasConflict: boolean;
    resolution: 'client' | 'server' | 'merge';
    resolvedItem: TMDBItem;
  } {
    // 比较更新时间
    const clientTime = new Date(clientItem.updatedAt).getTime();
    const serverTime = new Date(serverItem.updatedAt).getTime();

    // 如果时间相同，认为没有冲突
    if (Math.abs(clientTime - serverTime) < 1000) {
      return {
        hasConflict: false,
        resolution: 'client',
        resolvedItem: clientItem
      };
    }

    // 使用最新的数据
    if (clientTime > serverTime) {
      return {
        hasConflict: true,
        resolution: 'client',
        resolvedItem: clientItem
      };
    } else if (serverTime > clientTime) {
      return {
        hasConflict: true,
        resolution: 'server',
        resolvedItem: serverItem
      };
    } else {
      // 时间相同，尝试合并
      const mergedItem = this.mergeItems(clientItem, serverItem);
      return {
        hasConflict: true,
        resolution: 'merge',
        resolvedItem: mergedItem
      };
    }
  }

  /**
   * 解决任务冲突
   */
  private static resolveTaskConflict(clientTask: ScheduledTask, serverTask: ScheduledTask): {
    hasConflict: boolean;
    resolution: 'client' | 'server' | 'merge';
    resolvedTask: ScheduledTask;
  } {
    // 比较更新时间
    const clientTime = new Date(clientTask.updatedAt).getTime();
    const serverTime = new Date(serverTask.updatedAt).getTime();

    // 如果时间相同，认为没有冲突
    if (Math.abs(clientTime - serverTime) < 1000) {
      return {
        hasConflict: false,
        resolution: 'client',
        resolvedTask: clientTask
      };
    }

    // 使用最新的数据
    if (clientTime > serverTime) {
      return {
        hasConflict: true,
        resolution: 'client',
        resolvedTask: clientTask
      };
    } else {
      return {
        hasConflict: true,
        resolution: 'server',
        resolvedTask: serverTask
      };
    }
  }

  /**
   * 合并项目数据
   */
  private static mergeItems(clientItem: TMDBItem, serverItem: TMDBItem): TMDBItem {
    // 智能合并策略：保留最新的非空字段
    const merged = { ...serverItem };

    // 合并集数数据
    if (clientItem.episodes && serverItem.episodes) {
      const clientEpisodeMap = new Map(clientItem.episodes.map(ep => [ep.number, ep]));
      const mergedEpisodes = [...serverItem.episodes];

      for (const clientEp of clientItem.episodes) {
        const serverEp = mergedEpisodes.find(ep => ep.number === clientEp.number);
        if (!serverEp) {
          mergedEpisodes.push(clientEp);
        } else if (clientEp.completed && !serverEp.completed) {
          // 客户端标记为完成，服务端未完成 - 使用客户端状态
          serverEp.completed = true;
        }
      }

      merged.episodes = mergedEpisodes;
    } else if (clientItem.episodes) {
      merged.episodes = clientItem.episodes;
    }

    // 合并季数据
    if (clientItem.seasons && serverItem.seasons) {
      const mergedSeasons = [...serverItem.seasons];
      
      for (const clientSeason of clientItem.seasons) {
        const serverSeason = mergedSeasons.find(s => s.seasonNumber === clientSeason.seasonNumber);
        if (!serverSeason) {
          mergedSeasons.push(clientSeason);
        } else if (clientSeason.episodes && serverSeason.episodes) {
          // 合并季内的集数
          const mergedEpisodes = [...serverSeason.episodes];
          for (const clientEp of clientSeason.episodes) {
            const serverEp = mergedEpisodes.find(ep => ep.number === clientEp.number);
            if (!serverEp) {
              mergedEpisodes.push(clientEp);
            } else if (clientEp.completed && !serverEp.completed) {
              serverEp.completed = true;
            }
          }
          serverSeason.episodes = mergedEpisodes;
        }
      }

      merged.seasons = mergedSeasons;
    } else if (clientItem.seasons) {
      merged.seasons = clientItem.seasons;
    }

    // 使用最新的更新时间
    merged.updatedAt = new Date().toISOString();

    return merged;
  }

  /**
   * 获取客户端项目数据（现在使用服务端存储）
   */
  private static async getClientItems(): Promise<TMDBItem[]> {
    try {
      // 现在直接从服务端获取数据
      return await StorageManager.getItemsWithRetry();
    } catch (error) {
      console.error('[StorageSyncManager] 获取项目数据失败:', error);
      return [];
    }
  }

  /**
   * 获取客户端任务数据
   */
  private static async getClientTasks(): Promise<ScheduledTask[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem('tmdb_helper_scheduled_tasks');
        return data ? JSON.parse(data) : [];
      }
      return [];
    } catch (error) {
      console.error('[StorageSyncManager] 获取客户端任务数据失败:', error);
      return [];
    }
  }

  /**
   * 获取服务端数据
   */
  private static async getServerData(): Promise<{
    success: boolean;
    items?: TMDBItem[];
    tasks?: ScheduledTask[];
    version?: number;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/sync-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('[StorageSyncManager] 获取服务端数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 保存客户端项目数据（已移除localStorage，现在使用服务端存储）
   */
  private static async saveClientItems(items: TMDBItem[]): Promise<void> {
    console.warn('[StorageSyncManager] saveClientItems方法已废弃，数据现在直接存储在服务端');
  }

  /**
   * 保存客户端任务数据（已移除localStorage，现在使用服务端存储）
   */
  private static async saveClientTasks(tasks: ScheduledTask[]): Promise<void> {
    console.warn('[StorageSyncManager] saveClientTasks方法已废弃，数据现在直接存储在服务端');
  }

  /**
   * 获取同步状态
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    try {
      // 从服务端获取同步状态
      const response = await fetch('/api/config?key=sync_status');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.value) {
          return JSON.parse(data.value);
        }
      }

      // 默认状态
      return {
        lastSyncTime: new Date(0).toISOString(),
        clientVersion: 0,
        serverVersion: 0,
        conflictCount: 0,
        syncInProgress: false
      };
    } catch (error) {
      console.error('[StorageSyncManager] 获取同步状态失败:', error);
      return {
        lastSyncTime: new Date(0).toISOString(),
        clientVersion: 0,
        serverVersion: 0,
        conflictCount: 0,
        syncInProgress: false
      };
    }
  }

  /**
   * 更新同步状态
   */
  private static async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    try {
      const currentStatus = await this.getSyncStatus();
      const newStatus = { ...currentStatus, ...updates };

      // 现在使用服务端存储同步状态
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set',
          key: 'sync_status',
          value: JSON.stringify(newStatus)
        })
      });

      if (!response.ok) {
        console.warn('[StorageSyncManager] 保存同步状态到服务端失败');
      }
    } catch (error) {
      console.error('[StorageSyncManager] 更新同步状态失败:', error);
    }
  }

  /**
   * 强制全量同步
   */
  static async forceFullSync(): Promise<SyncResult> {
    console.log('[StorageSyncManager] 开始强制全量同步');
    
    // 重置同步状态
    await this.updateSyncStatus({
      clientVersion: 0,
      serverVersion: 0,
      conflictCount: 0
    });

    return await this.triggerSync();
  }

  /**
   * 获取同步统计信息
   */
  static async getSyncStats(): Promise<{
    status: SyncStatus;
    lockStatus: any;
    lastSyncAgo: string;
  }> {
    const status = await this.getSyncStatus();
    const lockStatus = await DistributedLock.getAllLockStatus();
    
    const lastSyncTime = new Date(status.lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    let lastSyncAgo: string;
    if (diffMinutes < 1) {
      lastSyncAgo = '刚刚';
    } else if (diffMinutes < 60) {
      lastSyncAgo = `${diffMinutes}分钟前`;
    } else if (diffMinutes < 24 * 60) {
      lastSyncAgo = `${Math.floor(diffMinutes / 60)}小时前`;
    } else {
      lastSyncAgo = `${Math.floor(diffMinutes / (24 * 60))}天前`;
    }

    return {
      status,
      lockStatus,
      lastSyncAgo
    };
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  StorageSyncManager.initialize();
}