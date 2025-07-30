/**
 * IndexedDB存储管理器
 * 提供高性能的本地数据存储，替代localStorage
 */

import { TMDBItem, ScheduledTask } from './storage';

interface DBSchema {
  items: TMDBItem;
  tasks: ScheduledTask;
  cache: {
    key: string;
    data: any;
    timestamp: number;
    ttl: number;
    size: number;
  };
  metadata: {
    key: string;
    value: any;
    updatedAt: string;
  };
}

export class IndexedDBStorage {
  private static instance: IndexedDBStorage;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'tmdb_helper_db';
  private readonly dbVersion = 2;
  private readonly maxCacheSize = 50 * 1024 * 1024; // 50MB缓存限制
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): IndexedDBStorage {
    if (!IndexedDBStorage.instance) {
      IndexedDBStorage.instance = new IndexedDBStorage();
    }
    return IndexedDBStorage.instance;
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB不可用'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建项目存储
        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('tmdbId', 'tmdbId', { unique: false });
          itemStore.createIndex('mediaType', 'mediaType', { unique: false });
          itemStore.createIndex('category', 'category', { unique: false });
          itemStore.createIndex('status', 'status', { unique: false });
          itemStore.createIndex('weekday', 'weekday', { unique: false });
          itemStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 创建任务存储
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('itemId', 'itemId', { unique: false });
          taskStore.createIndex('enabled', 'enabled', { unique: false });
          taskStore.createIndex('nextRun', 'nextRun', { unique: false });
        }

        // 创建缓存存储
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('size', 'size', { unique: false });
        }

        // 创建元数据存储
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('IndexedDB数据库结构升级完成');
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('数据库初始化失败');
    }
    return this.db;
  }

  /**
   * 执行事务操作
   */
  private async transaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    operation: (stores: IDBObjectStore | IDBObjectStore[]) => Promise<T> | T
  ): Promise<T> {
    const db = await this.ensureDB();
    const tx = db.transaction(storeNames, mode);
    
    return new Promise((resolve, reject) => {
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('事务被中止'));
      
      try {
        const stores = Array.isArray(storeNames) 
          ? storeNames.map(name => tx.objectStore(name))
          : tx.objectStore(storeNames);
        
        const result = operation(stores);
        
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // ===== 项目管理 =====

  /**
   * 获取所有项目
   */
  async getItems(): Promise<TMDBItem[]> {
    return this.transaction('items', 'readonly', (store) => {
      return new Promise<TMDBItem[]>((resolve, reject) => {
        const request = (store as IDBObjectStore).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 根据条件查询项目
   */
  async queryItems(filter: {
    mediaType?: 'movie' | 'tv';
    category?: string;
    status?: 'ongoing' | 'completed';
    weekday?: number;
  }): Promise<TMDBItem[]> {
    return this.transaction('items', 'readonly', (store) => {
      return new Promise<TMDBItem[]>((resolve, reject) => {
        const results: TMDBItem[] = [];
        const request = (store as IDBObjectStore).openCursor();
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const item = cursor.value as TMDBItem;
            let matches = true;
            
            if (filter.mediaType && item.mediaType !== filter.mediaType) matches = false;
            if (filter.category && item.category !== filter.category) matches = false;
            if (filter.status && item.status !== filter.status) matches = false;
            if (filter.weekday !== undefined && item.weekday !== filter.weekday) matches = false;
            
            if (matches) {
              results.push(item);
            }
            
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 添加或更新项目
   */
  async saveItem(item: TMDBItem): Promise<void> {
    return this.transaction('items', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 批量保存项目
   */
  async saveItems(items: TMDBItem[]): Promise<void> {
    return this.transaction('items', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        let completed = 0;
        const total = items.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        items.forEach(item => {
          const request = (store as IDBObjectStore).put(item);
          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      });
    });
  }

  /**
   * 删除项目
   */
  async deleteItem(id: string): Promise<void> {
    return this.transaction(['items', 'tasks'], 'readwrite', (stores) => {
      const [itemStore, taskStore] = stores as IDBObjectStore[];
      
      return new Promise<void>((resolve, reject) => {
        // 删除项目
        const deleteItemRequest = itemStore.delete(id);
        
        deleteItemRequest.onsuccess = () => {
          // 删除相关任务
          const taskIndex = taskStore.index('itemId');
          const taskRequest = taskIndex.openCursor(IDBKeyRange.only(id));
          
          taskRequest.onsuccess = () => {
            const cursor = taskRequest.result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              resolve();
            }
          };
          
          taskRequest.onerror = () => reject(taskRequest.error);
        };
        
        deleteItemRequest.onerror = () => reject(deleteItemRequest.error);
      });
    });
  }

  // ===== 任务管理 =====

  /**
   * 获取所有任务
   */
  async getTasks(): Promise<ScheduledTask[]> {
    return this.transaction('tasks', 'readonly', (store) => {
      return new Promise<ScheduledTask[]>((resolve, reject) => {
        const request = (store as IDBObjectStore).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 保存任务
   */
  async saveTask(task: ScheduledTask): Promise<void> {
    return this.transaction('tasks', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(task);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<void> {
    return this.transaction('tasks', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // ===== 缓存管理 =====

  /**
   * 设置缓存
   */
  async setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;
    
    // 检查缓存大小限制
    await this.cleanupCache();
    
    const cacheItem = {
      key,
      data: serialized,
      timestamp: Date.now(),
      ttl,
      size
    };

    return this.transaction('cache', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(cacheItem);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 获取缓存
   */
  async getCache(key: string): Promise<any | null> {
    return this.transaction('cache', 'readonly', (store) => {
      return new Promise<any | null>((resolve, reject) => {
        const request = (store as IDBObjectStore).get(key);
        
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }
          
          // 检查是否过期
          if (Date.now() - result.timestamp > result.ttl) {
            // 异步删除过期缓存
            this.deleteCache(key).catch(console.error);
            resolve(null);
            return;
          }
          
          try {
            resolve(JSON.parse(result.data));
          } catch (error) {
            console.error('缓存数据解析失败:', error);
            resolve(null);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 删除缓存
   */
  async deleteCache(key: string): Promise<void> {
    return this.transaction('cache', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 清理过期缓存
   */
  async cleanupCache(): Promise<void> {
    return this.transaction('cache', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const now = Date.now();
        let totalSize = 0;
        const expiredKeys: string[] = [];
        const allItems: Array<{ key: string; timestamp: number; ttl: number; size: number }> = [];
        
        const request = (store as IDBObjectStore).openCursor();
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const item = cursor.value;
            totalSize += item.size;
            
            // 检查是否过期
            if (now - item.timestamp > item.ttl) {
              expiredKeys.push(item.key);
            } else {
              allItems.push(item);
            }
            
            cursor.continue();
          } else {
            // 删除过期项
            let deletedCount = 0;
            const deleteNext = () => {
              if (deletedCount < expiredKeys.length) {
                const deleteRequest = (store as IDBObjectStore).delete(expiredKeys[deletedCount]);
                deleteRequest.onsuccess = () => {
                  deletedCount++;
                  deleteNext();
                };
                deleteRequest.onerror = () => reject(deleteRequest.error);
              } else {
                // 检查总大小是否超限
                if (totalSize > this.maxCacheSize) {
                  this.evictLRUCache(allItems, store as IDBObjectStore).then(resolve).catch(reject);
                } else {
                  resolve();
                }
              }
            };
            
            deleteNext();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * LRU缓存淘汰
   */
  private async evictLRUCache(
    items: Array<{ key: string; timestamp: number; ttl: number; size: number }>,
    store: IDBObjectStore
  ): Promise<void> {
    // 按时间戳排序，删除最旧的项目直到大小合适
    items.sort((a, b) => a.timestamp - b.timestamp);
    
    let currentSize = items.reduce((sum, item) => sum + item.size, 0);
    const targetSize = this.maxCacheSize * 0.8; // 清理到80%
    
    let deleteIndex = 0;
    while (currentSize > targetSize && deleteIndex < items.length) {
      const item = items[deleteIndex];
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = store.delete(item.key);
        deleteRequest.onsuccess = () => {
          currentSize -= item.size;
          resolve();
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
      deleteIndex++;
    }
  }

  // ===== 数据压缩 =====

  /**
   * 压缩数据
   */
  private async compressData(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    
    // 使用简单的压缩算法（实际项目中可以使用更好的压缩库）
    if (typeof CompressionStream !== 'undefined') {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonString));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return btoa(String.fromCharCode(...compressed));
      } catch (error) {
        console.warn('压缩失败，使用原始数据:', error);
      }
    }
    
    return jsonString;
  }

  /**
   * 解压数据
   */
  private async decompressData(compressedData: string): Promise<any> {
    try {
      // 尝试解压
      if (typeof DecompressionStream !== 'undefined') {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressed);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        const jsonString = new TextDecoder().decode(decompressed);
        return JSON.parse(jsonString);
      }
    } catch (error) {
      console.warn('解压失败，尝试直接解析:', error);
    }
    
    // 如果解压失败，尝试直接解析
    return JSON.parse(compressedData);
  }

  // ===== 统计信息 =====

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    items: number;
    tasks: number;
    cacheEntries: number;
    totalCacheSize: number;
    dbSize: number;
  }> {
    const db = await this.ensureDB();
    
    const [itemCount, taskCount, cacheStats] = await Promise.all([
      this.transaction('items', 'readonly', (store) => {
        return new Promise<number>((resolve, reject) => {
          const request = (store as IDBObjectStore).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }),
      
      this.transaction('tasks', 'readonly', (store) => {
        return new Promise<number>((resolve, reject) => {
          const request = (store as IDBObjectStore).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }),
      
      this.transaction('cache', 'readonly', (store) => {
        return new Promise<{ count: number; totalSize: number }>((resolve, reject) => {
          let count = 0;
          let totalSize = 0;
          const request = (store as IDBObjectStore).openCursor();
          
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              count++;
              totalSize += cursor.value.size || 0;
              cursor.continue();
            } else {
              resolve({ count, totalSize });
            }
          };
          
          request.onerror = () => reject(request.error);
        });
      })
    ]);

    // 估算数据库大小
    const dbSize = await this.estimateDBSize();

    return {
      items: itemCount,
      tasks: taskCount,
      cacheEntries: cacheStats.count,
      totalCacheSize: cacheStats.totalSize,
      dbSize
    };
  }

  /**
   * 估算数据库大小
   */
  private async estimateDBSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      } catch (error) {
        console.warn('无法获取存储使用情况:', error);
      }
    }
    return 0;
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const storeNames = ['items', 'tasks', 'cache', 'metadata'];
    
    return this.transaction(storeNames, 'readwrite', (stores) => {
      const promises = (stores as IDBObjectStore[]).map(store => {
        return new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      return Promise.all(promises).then(() => {});
    });
  }
}

// 导出单例实例
export const indexedDBStorage = IndexedDBStorage.getInstance();