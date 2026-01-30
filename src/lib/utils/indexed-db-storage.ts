/**
 * IndexedDB 存储适配器
 * 为网络优化器提供 IndexedDB 缓存支持
 */

import { logger } from './logger';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

class IndexedDBStorage {
  private dbName = 'tmdb-helper-cache';
  private storeName = 'cache';
  private db: IDBDatabase | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        logger.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    await this.initialize();

    if (!this.db) {
      logger.warn('IndexedDB not initialized');
      return null;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if cache entry is expired
        const now = Date.now();
        const age = now - entry.timestamp;
        if (age > entry.ttl) {
          logger.debug(`Cache expired for key: ${key}`);
          this.deleteCache(key).catch((err) => {
            logger.warn(`Failed to delete expired cache: ${err}`);
          });
          resolve(null);
          return;
        }

        logger.debug(`Cache hit for key: ${key}`);
        resolve(entry.data);
      };

      request.onerror = () => {
        logger.warn(`Failed to get cache for key: ${key}`);
        resolve(null);
      };
    });
  }

  async setCache<T>(key: string, data: T, ttl: number): Promise<void> {
    await this.initialize();

    if (!this.db) {
      logger.warn('IndexedDB not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      const request = store.put({ key, ...entry });

      request.onsuccess = () => {
        logger.debug(`Cache set for key: ${key}`);
        resolve();
      };

      request.onerror = () => {
        logger.error(`Failed to set cache for key: ${key}`);
        reject(request.error);
      };
    });
  }

  async deleteCache(key: string): Promise<void> {
    await this.initialize();

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        logger.debug(`Cache deleted for key: ${key}`);
        resolve();
      };

      request.onerror = () => {
        logger.warn(`Failed to delete cache for key: ${key}`);
        reject(request.error);
      };
    });
  }

  async cleanupCache(): Promise<number> {
    await this.initialize();

    if (!this.db) {
      return 0;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const now = Date.now();
      let deletedCount = 0;

      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) {
          logger.info(`Cleaned up ${deletedCount} expired cache entries`);
          resolve(deletedCount);
          return;
        }

        const entry = cursor.value as CacheEntry & { key: string };
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          // Since we're iterating by timestamp (ascending),
          // we can stop once we hit a non-expired entry
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        logger.error('Failed to cleanup cache');
        resolve(deletedCount);
      };
    });
  }

  async getStorageStats(): Promise<{ count: number; size: number }> {
    await this.initialize();

    if (!this.db) {
      return { count: 0, size: 0 };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        // Estimate size (this is a rough estimate)
        const estimatedSize = count * 1024; // Assume 1KB per entry
        resolve({ count, size: estimatedSize });
      };

      countRequest.onerror = () => {
        logger.error('Failed to get storage stats');
        resolve({ count: 0, size: 0 });
      };
    });
  }

  async clear(): Promise<void> {
    await this.initialize();

    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        logger.info('Cache cleared');
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to clear cache');
        reject(request.error);
      };
    });
  }
}

export const indexedDBStorage = new IndexedDBStorage();