/**
 * 缓存管理器
 * 提供内存缓存功能，支持 TTL 和 LRU 淘汰策略
 */

import { logger } from '@/lib/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private stats = { hits: 0, misses: 0 };

  private constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // LRU 淘汰：如果缓存已满，删除最少使用的条目
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: 0,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * 清空匹配前缀的缓存
   */
  clearPattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * LRU 淘汰策略
   */
  private evictLRU(): void {
    let minHits = Infinity;
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // 优先删除命中次数最少的
      if (entry.hits < minHits) {
        minHits = entry.hits;
        oldestKey = key;
        oldestTime = entry.timestamp;
      } else if (entry.hits === minHits && entry.timestamp < oldestTime) {
        // 如果命中次数相同，删除最旧的
        oldestKey = key;
        oldestTime = entry.timestamp;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`[CacheManager] LRU 淘汰: ${oldestKey}`);
    }
  }
}

// 导出单例
export const cacheManager = CacheManager.getInstance();

// 缓存键生成器
export const CacheKeys = {
  items: {
    all: 'items:all',
    byId: (id: string) => `items:id:${id}`,
    byTmdbId: (tmdbId: string) => `items:tmdb:${tmdbId}`,
    byWeekday: (weekday: number) => `items:weekday:${weekday}`,
  },
  tasks: {
    all: 'tasks:all',
    byId: (id: string) => `tasks:id:${id}`,
    byItemId: (itemId: string) => `tasks:item:${itemId}`,
    enabled: 'tasks:enabled',
  },
  config: {
    all: 'config:all',
    byKey: (key: string) => `config:key:${key}`,
  },
  chat: {
    all: 'chat:all',
    byId: (id: string) => `chat:id:${id}`,
  },
};
