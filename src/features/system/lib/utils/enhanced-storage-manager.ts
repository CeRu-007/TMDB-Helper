/**
 * 增强存储管理器
 * 为 Docker 环境提供增强的存储管理功能
 */

import { logger } from '@/lib/utils/logger';

interface HealthStatus {
  status: 'ok' | 'warning' | 'error';
  details: {
    lastError?: string;
    storageSize?: number;
    cacheSize?: number;
    lastCleanup?: number;
  };
}

interface StorageStats {
  totalSize: number;
  cacheSize: number;
  itemCount: number;
  lastCleanup: number;
}

class EnhancedStorageManager {
  private static instance: EnhancedStorageManager;
  private initialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): EnhancedStorageManager {
    if (!EnhancedStorageManager.instance) {
      EnhancedStorageManager.instance = new EnhancedStorageManager();
    }
    return EnhancedStorageManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize storage systems
      await this.checkLocalStorage();
      await this.checkIndexedDB();

      // Start health check interval
      this.startHealthCheck();

      this.initialized = true;
      logger.info('Enhanced storage manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize enhanced storage manager:', error);
      throw error;
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const stats = await this.getStats();
      const warnings: string[] = [];

      // Check storage size
      if (stats.totalSize > 50 * 1024 * 1024) { // 50MB
        warnings.push(`Storage size is large: ${Math.round(stats.totalSize / 1024 / 1024)}MB`);
      }

      // Check cache size
      if (stats.cacheSize > 10 * 1024 * 1024) { // 10MB
        warnings.push(`Cache size is large: ${Math.round(stats.cacheSize / 1024 / 1024)}MB`);
      }

      // Check last cleanup
      const now = Date.now();
      const daysSinceCleanup = (now - stats.lastCleanup) / (1000 * 60 * 60 * 24);
      if (daysSinceCleanup > 7) {
        warnings.push(`Last cleanup was ${Math.round(daysSinceCleanup)} days ago`);
      }

      if (warnings.length > 0) {
        return {
          status: 'warning',
          details: {
            storageSize: stats.totalSize,
            cacheSize: stats.cacheSize,
            lastCleanup: stats.lastCleanup,
          },
        };
      }

      return {
        status: 'ok',
        details: {
          storageSize: stats.totalSize,
          cacheSize: stats.cacheSize,
          lastCleanup: stats.lastCleanup,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          lastError: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const localStorageSize = this.getLocalStorageSize();
      const indexedDBSize = await this.getIndexedDBSize();
      const itemCount = this.getItemCount();

      return {
        totalSize: localStorageSize + indexedDBSize,
        cacheSize: indexedDBSize,
        itemCount,
        lastCleanup: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      return {
        totalSize: 0,
        cacheSize: 0,
        itemCount: 0,
        lastCleanup: Date.now(),
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      logger.info('Starting storage cleanup...');

      // Cleanup expired cache entries
      await this.cleanupExpiredCache();

      // Cleanup old data
      await this.cleanupOldData();

      logger.info('Storage cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup storage:', error);
      throw error;
    }
  }

  private async checkLocalStorage(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      logger.warn('LocalStorage not available:', error);
      return false;
    }
  }

  private async checkIndexedDB(): Promise<boolean> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return false;
    }

    try {
      const testDB = indexedDB.open('__storage_test__', 1);
      await new Promise<void>((resolve, reject) => {
        testDB.onsuccess = () => {
          testDB.result.close();
          indexedDB.deleteDatabase('__storage_test__');
          resolve();
        };
        testDB.onerror = () => reject(testDB.error);
      });
      return true;
    } catch (error) {
      logger.warn('IndexedDB not available:', error);
      return false;
    }
  }

  private getLocalStorageSize(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2; // UTF-16 characters
      }
    }
    return total;
  }

  private async getIndexedDBSize(): Promise<number> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return 0;
    }

    try {
      const dbs = await indexedDB.databases();
      let totalSize = 0;

      for (const db of dbs) {
        if (db.name) {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage) {
            totalSize += estimate.usage;
          }
        }
      }

      return totalSize;
    } catch (error) {
      logger.warn('Failed to get IndexedDB size:', error);
      return 0;
    }
  }

  private getItemCount(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    let count = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        count++;
      }
    }
    return count;
  }

  private async cleanupExpiredCache(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Cleanup localStorage cache entries
      const keysToRemove: string[] = [];
      const now = Date.now();

      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('cache_')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const entry = JSON.parse(value);
              if (entry.timestamp && entry.ttl) {
                const age = now - entry.timestamp;
                if (age > entry.ttl) {
                  keysToRemove.push(key);
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      if (keysToRemove.length > 0) {
        logger.info(`Cleaned up ${keysToRemove.length} expired cache entries from localStorage`);
      }
    } catch (error) {
      logger.warn('Failed to cleanup expired cache:', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    // Placeholder for old data cleanup logic
    // This can be extended based on specific requirements
    logger.debug('Old data cleanup check completed');
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const health = await this.getHealthStatus();
      if (health.status === 'error') {
        logger.error('Storage health check failed:', health.details);
      } else if (health.status === 'warning') {
        logger.warn('Storage health check warnings:', health.details);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health check stopped');
    }
  }

  async clearAll(): Promise<void> {
    try {
      logger.info('Clearing all storage...');

      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear();

        // Clear IndexedDB
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name && db.name !== '__storage_test__') {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }

      logger.info('All storage cleared');
    } catch (error) {
      logger.error('Failed to clear storage:', error);
      throw error;
    }
  }
}

export const enhancedStorageManager = EnhancedStorageManager.getInstance();