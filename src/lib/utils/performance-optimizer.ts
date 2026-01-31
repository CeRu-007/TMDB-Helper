/**
 * 性能优化器
 * 用于监控和优化应用性能
 */

import { DELAY_1S, INTERVAL_1H } from '@/lib/constants/constants';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  imageLoadTime: number;
  chunkLoadTime: number;
  memoryUsage: number;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleanup: number;
}

export class PerformanceOptimizer {
  private static readonly METRICS_KEY = 'tmdb_performance_metrics';
  private static readonly CACHE_STATS_KEY = 'tmdb_cache_stats';
  private static readonly MAX_METRICS_COUNT = 100;
  private static readonly CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 记录页面加载性能
   */
  static recordPageLoad(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;

      this.recordMetric({
        pageLoadTime,
        apiResponseTime: 0,
        imageLoadTime: 0,
        chunkLoadTime: 0,
        memoryUsage: this.getMemoryUsage(),
        timestamp: Date.now()
      });
    } catch (error) {
      // 静默处理性能记录错误
    }
  }

  /**
   * 记录API响应时间
   */
  static recordApiResponse(startTime: number, endTime: number): void {
    const responseTime = endTime - startTime;
    
    this.recordMetric({
      pageLoadTime: 0,
      apiResponseTime: responseTime,
      imageLoadTime: 0,
      chunkLoadTime: 0,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now()
    });
  }

  /**
   * 记录图片加载时间
   */
  static recordImageLoad(startTime: number, endTime: number): void {
    const loadTime = endTime - startTime;
    
    this.recordMetric({
      pageLoadTime: 0,
      apiResponseTime: 0,
      imageLoadTime: loadTime,
      chunkLoadTime: 0,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now()
    });
  }

  /**
   * 监控chunk加载错误
   */
  static monitorChunkLoading(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      if (event.filename && event.filename.includes('_next/static/chunks/')) {
        this.handleChunkLoadError(event.filename);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('ChunkLoadError')) {
        this.handleChunkLoadError('unknown');
      }
    });
  }

  /**
   * 处理chunk加载错误
   */
  private static handleChunkLoadError(chunkName: string): void {
    setTimeout(() => {
      if (confirm('检测到资源加载失败，是否重新加载页面？')) {
        window.location.reload();
      }
    }, DELAY_1S);
  }

  /**
   * 获取内存使用情况
   */
  private static getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * 记录性能指标
   */
  private static recordMetric(metric: PerformanceMetrics): void {
    try {
      const metrics = this.getMetrics();
      metrics.push(metric);

      if (metrics.length > this.MAX_METRICS_COUNT) {
        metrics.splice(0, metrics.length - this.MAX_METRICS_COUNT);
      }

      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.METRICS_KEY, JSON.stringify(metrics));
      }
    } catch (error) {
      // 静默处理存储错误
    }
  }

  /**
   * 获取性能指标
   */
  static getMetrics(): PerformanceMetrics[] {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }
      const stored = localStorage.getItem(this.METRICS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取性能统计
   */
  static getPerformanceStats(): {
    avgPageLoadTime: number;
    avgApiResponseTime: number;
    avgImageLoadTime: number;
    avgMemoryUsage: number;
    totalMetrics: number;
  } {
    const metrics = this.getMetrics();
    
    if (metrics.length === 0) {
      return {
        avgPageLoadTime: 0,
        avgApiResponseTime: 0,
        avgImageLoadTime: 0,
        avgMemoryUsage: 0,
        totalMetrics: 0
      };
    }

    const validPageLoads = metrics.filter(m => m.pageLoadTime > 0);
    const validApiResponses = metrics.filter(m => m.apiResponseTime > 0);
    const validImageLoads = metrics.filter(m => m.imageLoadTime > 0);

    return {
      avgPageLoadTime: validPageLoads.length > 0 ? 
        validPageLoads.reduce((sum, m) => sum + m.pageLoadTime, 0) / validPageLoads.length : 0,
      avgApiResponseTime: validApiResponses.length > 0 ? 
        validApiResponses.reduce((sum, m) => sum + m.apiResponseTime, 0) / validApiResponses.length : 0,
      avgImageLoadTime: validImageLoads.length > 0 ? 
        validImageLoads.reduce((sum, m) => sum + m.imageLoadTime, 0) / validImageLoads.length : 0,
      avgMemoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length,
      totalMetrics: metrics.length
    };
  }

  /**
   * 更新缓存统计
   */
  static updateCacheStats(isHit: boolean): void {
    try {
      const stats = this.getCacheStats();
      
      if (isHit) {
        stats.hits++;
      } else {
        stats.misses++;
      }

      localStorage.setItem(this.CACHE_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      // 静默处理缓存统计更新错误
    }
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats(): CacheStats {
    try {
      const stored = localStorage.getItem(this.CACHE_STATS_KEY);
      return stored ? JSON.parse(stored) : {
        hits: 0,
        misses: 0,
        size: 0,
        lastCleanup: Date.now()
      };
    } catch (error) {
      return {
        hits: 0,
        misses: 0,
        size: 0,
        lastCleanup: Date.now()
      };
    }
  }

  /**
   * 清理过期缓存
   */
  static cleanupExpiredCache(): void {
    try {
      const stats = this.getCacheStats();
      const now = Date.now();

      if (now - stats.lastCleanup < this.CACHE_CLEANUP_INTERVAL) {
        return;
      }

      // 已切换到服务端存储，跳过本地缓存清理

      stats.lastCleanup = now;
      stats.size = this.calculateCacheSize();
      localStorage.setItem(this.CACHE_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      // 静默处理缓存清理错误
    }
  }

  /**
   * 计算缓存大小
   */
  private static calculateCacheSize(): number {
    let size = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tmdb_')) {
          const item = localStorage.getItem(key);
          if (item) {
            size += item.length;
          }
        }
      }
    } catch (error) {
      // 静默处理缓存大小计算错误
    }
    return size;
  }

  /**
   * 初始化性能监控
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    this.monitorChunkLoading();

    if (document.readyState === 'complete') {
      this.recordPageLoad();
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.recordPageLoad(), 100);
      });
    }

    setInterval(() => {
      this.cleanupExpiredCache();
    }, INTERVAL_1H);
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  PerformanceOptimizer.initialize();
}