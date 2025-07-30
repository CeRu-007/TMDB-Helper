/**
 * 网络请求优化管理器
 * 提供请求去重、批量请求、智能缓存和预加载功能
 */

import { indexedDBStorage } from './indexed-db-storage';
import { dockerStorageAdapter } from './docker-storage-adapter';

interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  priority?: 'low' | 'normal' | 'high';
}

interface BatchRequest {
  id: string;
  config: RequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface RequestMetrics {
  url: string;
  method: string;
  duration: number;
  success: boolean;
  cacheHit: boolean;
  timestamp: number;
  size: number;
}

export class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueue: BatchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchDelay = 50; // 50ms批量延迟
  private readonly maxBatchSize = 10;
  private requestMetrics: RequestMetrics[] = [];
  private readonly maxMetricsHistory = 1000;

  private constructor() {
    this.initializeDockerSupport();
  }

  /**
   * 初始化Docker支持
   */
  private initializeDockerSupport(): void {
    try {
      const networkConfig = dockerStorageAdapter.getNetworkConfig();
      const env = dockerStorageAdapter.getEnvironment();
      
      if (env.isDocker) {
        console.log('网络优化器: 检测到Docker环境，应用Docker网络配置:', networkConfig);
        
        // 应用Docker特定的配置
        this.maxBatchSize = Math.min(this.maxBatchSize, networkConfig.maxConcurrentRequests);
        
        // 在Docker环境中增加批量延迟以减少网络压力
        (this as any).batchDelay = Math.max(this.batchDelay, 100);
        
        console.log('网络优化器: Docker配置已应用');
      }
    } catch (error) {
      console.warn('网络优化器: Docker支持初始化失败:', error);
    }
  }

  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  /**
   * 生成请求缓存键
   */
  private generateCacheKey(config: RequestConfig): string {
    const { url, method = 'GET', body } = config;
    const bodyHash = body ? this.hashCode(JSON.stringify(body)) : '';
    return `req_${method}_${url}_${bodyHash}`;
  }

  /**
   * 简单哈希函数
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成请求去重键
   */
  private generateDedupeKey(config: RequestConfig): string {
    const { url, method = 'GET', body } = config;
    // 对于GET请求，只考虑URL
    if (method === 'GET') {
      return `${method}_${url}`;
    }
    // 对于其他请求，考虑URL和body
    const bodyHash = body ? this.hashCode(JSON.stringify(body)) : '';
    return `${method}_${url}_${bodyHash}`;
  }

  /**
   * 执行单个请求
   */
  async request<T = any>(config: RequestConfig): Promise<T> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(config);
    const dedupeKey = this.generateDedupeKey(config);

    try {
      // 1. 检查缓存（仅GET请求）
      if (config.cache !== false && (config.method || 'GET') === 'GET') {
        const cached = await indexedDBStorage.getCache(cacheKey);
        if (cached) {
          this.recordMetrics({
            url: config.url,
            method: config.method || 'GET',
            duration: performance.now() - startTime,
            success: true,
            cacheHit: true,
            timestamp: Date.now(),
            size: JSON.stringify(cached).length
          });
          return cached;
        }
      }

      // 2. 检查请求去重
      if (this.pendingRequests.has(dedupeKey)) {
        console.log(`请求去重: ${config.url}`);
        return await this.pendingRequests.get(dedupeKey)!;
      }

      // 3. 创建请求Promise
      const requestPromise = this.executeRequest(config);
      this.pendingRequests.set(dedupeKey, requestPromise);

      try {
        const result = await requestPromise;
        
        // 4. 缓存成功的GET请求结果
        if (config.cache !== false && (config.method || 'GET') === 'GET') {
          const ttl = config.cacheTTL || 5 * 60 * 1000; // 默认5分钟
          await indexedDBStorage.setCache(cacheKey, result, ttl);
        }

        this.recordMetrics({
          url: config.url,
          method: config.method || 'GET',
          duration: performance.now() - startTime,
          success: true,
          cacheHit: false,
          timestamp: Date.now(),
          size: JSON.stringify(result).length
        });

        return result;
      } finally {
        // 清理去重记录
        this.pendingRequests.delete(dedupeKey);
      }
    } catch (error) {
      this.recordMetrics({
        url: config.url,
        method: config.method || 'GET',
        duration: performance.now() - startTime,
        success: false,
        cacheHit: false,
        timestamp: Date.now(),
        size: 0
      });
      throw error;
    }
  }

  /**
   * 执行实际的网络请求
   */
  private async executeRequest(config: RequestConfig): Promise<any> {
    // 获取Docker环境的网络配置
    const networkConfig = dockerStorageAdapter.getNetworkConfig();
    
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = networkConfig.requestTimeout,
      retries = networkConfig.retryAttempts
    } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          return result;
        } catch (error) {
          lastError = error as Error;
          
          // 如果是最后一次尝试或者是不可重试的错误，直接抛出
          if (attempt === retries || this.isNonRetryableError(error)) {
            throw error;
          }
          
          // 等待一段时间后重试
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 判断是否为不可重试的错误
   */
  private isNonRetryableError(error: any): boolean {
    if (error.name === 'AbortError') return true;
    if (error.message?.includes('400')) return true; // Bad Request
    if (error.message?.includes('401')) return true; // Unauthorized
    if (error.message?.includes('403')) return true; // Forbidden
    if (error.message?.includes('404')) return true; // Not Found
    return false;
  }

  /**
   * 批量请求
   */
  async batchRequest<T = any>(configs: RequestConfig[]): Promise<T[]> {
    return Promise.all(configs.map(config => this.request<T>(config)));
  }

  /**
   * 添加到批量队列
   */
  addToBatch<T = any>(config: RequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest = {
        id: Math.random().toString(36).substr(2, 9),
        config,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.batchQueue.push(batchRequest);

      // 如果队列满了或者是第一个请求，立即处理
      if (this.batchQueue.length >= this.maxBatchSize || this.batchQueue.length === 1) {
        this.processBatchQueue();
      } else if (!this.batchTimer) {
        // 设置延迟处理
        this.batchTimer = setTimeout(() => {
          this.processBatchQueue();
        }, this.batchDelay);
      }
    });
  }

  /**
   * 处理批量队列
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) return;

    const currentBatch = this.batchQueue.splice(0, this.maxBatchSize);
    console.log(`处理批量请求: ${currentBatch.length} 个请求`);

    // 按优先级排序
    currentBatch.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.config.priority || 'normal'];
      const bPriority = priorityOrder[b.config.priority || 'normal'];
      return bPriority - aPriority;
    });

    // 并发执行所有请求
    const promises = currentBatch.map(async (batchRequest) => {
      try {
        const result = await this.request(batchRequest.config);
        batchRequest.resolve(result);
      } catch (error) {
        batchRequest.reject(error);
      }
    });

    await Promise.allSettled(promises);

    // 如果还有待处理的请求，继续处理
    if (this.batchQueue.length > 0) {
      setTimeout(() => this.processBatchQueue(), 10);
    }
  }

  /**
   * 智能预加载
   */
  async preload(configs: RequestConfig[]): Promise<void> {
    console.log(`开始预加载 ${configs.length} 个资源`);
    
    // 按优先级分组
    const highPriority = configs.filter(c => c.priority === 'high');
    const normalPriority = configs.filter(c => c.priority === 'normal' || !c.priority);
    const lowPriority = configs.filter(c => c.priority === 'low');

    try {
      // 高优先级立即加载
      if (highPriority.length > 0) {
        await Promise.allSettled(highPriority.map(config => this.request(config)));
      }

      // 普通优先级延迟加载
      if (normalPriority.length > 0) {
        setTimeout(() => {
          Promise.allSettled(normalPriority.map(config => this.request(config)));
        }, 100);
      }

      // 低优先级在空闲时加载
      if (lowPriority.length > 0) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            Promise.allSettled(lowPriority.map(config => this.request(config)));
          });
        } else {
          setTimeout(() => {
            Promise.allSettled(lowPriority.map(config => this.request(config)));
          }, 1000);
        }
      }
    } catch (error) {
      console.warn('预加载过程中出现错误:', error);
    }
  }

  /**
   * 记录请求指标
   */
  private recordMetrics(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);
    
    // 保持指标历史记录在限制范围内
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    cacheHitRate: number;
    totalDataTransferred: number;
    requestsByUrl: Record<string, number>;
    slowestRequests: RequestMetrics[];
  } {
    const total = this.requestMetrics.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        totalDataTransferred: 0,
        requestsByUrl: {},
        slowestRequests: []
      };
    }

    const successful = this.requestMetrics.filter(m => m.success).length;
    const cacheHits = this.requestMetrics.filter(m => m.cacheHit).length;
    const totalDuration = this.requestMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalSize = this.requestMetrics.reduce((sum, m) => sum + m.size, 0);

    // 按URL统计请求次数
    const requestsByUrl: Record<string, number> = {};
    this.requestMetrics.forEach(m => {
      requestsByUrl[m.url] = (requestsByUrl[m.url] || 0) + 1;
    });

    // 最慢的10个请求
    const slowestRequests = [...this.requestMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalRequests: total,
      successRate: successful / total,
      averageResponseTime: totalDuration / total,
      cacheHitRate: cacheHits / total,
      totalDataTransferred: totalSize,
      requestsByUrl,
      slowestRequests
    };
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      // 这里需要实现模式匹配的缓存清除
      console.log(`清除匹配模式 "${pattern}" 的缓存`);
      // 由于IndexedDB的限制，这里简化实现
      await indexedDBStorage.cleanupCache();
    } else {
      // 清除所有缓存
      const db = indexedDBStorage;
      const transaction = await db.transaction('cache', 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = (transaction as any).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{
    entries: number;
    totalSize: number;
    hitRate: number;
  }> {
    const stats = await indexedDBStorage.getStorageStats();
    const metrics = this.getPerformanceStats();
    
    return {
      entries: stats.cacheEntries,
      totalSize: stats.totalCacheSize,
      hitRate: metrics.cacheHitRate
    };
  }

  /**
   * 清理性能指标
   */
  clearMetrics(): void {
    this.requestMetrics = [];
  }

  /**
   * 取消所有待处理的请求
   */
  cancelAllRequests(): void {
    this.pendingRequests.clear();
    
    // 清空批量队列
    this.batchQueue.forEach(request => {
      request.reject(new Error('请求已取消'));
    });
    this.batchQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

// TMDB API专用网络优化器
export class TMDBNetworkOptimizer {
  private optimizer: NetworkOptimizer;
  private apiKey: string | null = null;
  private baseURL = 'https://api.themoviedb.org/3';

  constructor() {
    this.optimizer = NetworkOptimizer.getInstance();
    this.loadApiKey();
  }

  private loadApiKey(): void {
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem('tmdb_api_key');
    }
  }

  private getAuthParams(): Record<string, string> {
    if (!this.apiKey) {
      this.loadApiKey();
    }
    return this.apiKey ? { api_key: this.apiKey } : {};
  }

  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const allParams = { ...this.getAuthParams(), ...params };
    const searchParams = new URLSearchParams();
    
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    return `${this.baseURL}${endpoint}?${searchParams.toString()}`;
  }

  /**
   * 搜索电影
   */
  async searchMovie(query: string, options: {
    language?: string;
    page?: number;
    includeAdult?: boolean;
    region?: string;
    year?: number;
    primaryReleaseYear?: number;
  } = {}): Promise<any> {
    const url = this.buildUrl('/search/movie', {
      query,
      language: options.language || 'zh-CN',
      page: options.page || 1,
      include_adult: options.includeAdult || false,
      region: options.region,
      year: options.year,
      primary_release_year: options.primaryReleaseYear
    });

    return this.optimizer.request({
      url,
      method: 'GET',
      cache: true,
      cacheTTL: 10 * 60 * 1000, // 10分钟缓存
      priority: 'normal'
    });
  }

  /**
   * 搜索电视剧
   */
  async searchTV(query: string, options: {
    language?: string;
    page?: number;
    includeAdult?: boolean;
    firstAirDateYear?: number;
  } = {}): Promise<any> {
    const url = this.buildUrl('/search/tv', {
      query,
      language: options.language || 'zh-CN',
      page: options.page || 1,
      include_adult: options.includeAdult || false,
      first_air_date_year: options.firstAirDateYear
    });

    return this.optimizer.request({
      url,
      method: 'GET',
      cache: true,
      cacheTTL: 10 * 60 * 1000,
      priority: 'normal'
    });
  }

  /**
   * 获取电影详情
   */
  async getMovieDetails(movieId: string, options: {
    language?: string;
    appendToResponse?: string[];
  } = {}): Promise<any> {
    const url = this.buildUrl(`/movie/${movieId}`, {
      language: options.language || 'zh-CN',
      append_to_response: options.appendToResponse?.join(',')
    });

    return this.optimizer.request({
      url,
      method: 'GET',
      cache: true,
      cacheTTL: 30 * 60 * 1000, // 30分钟缓存
      priority: 'high'
    });
  }

  /**
   * 获取电视剧详情
   */
  async getTVDetails(tvId: string, options: {
    language?: string;
    appendToResponse?: string[];
  } = {}): Promise<any> {
    const url = this.buildUrl(`/tv/${tvId}`, {
      language: options.language || 'zh-CN',
      append_to_response: options.appendToResponse?.join(',')
    });

    return this.optimizer.request({
      url,
      method: 'GET',
      cache: true,
      cacheTTL: 30 * 60 * 1000,
      priority: 'high'
    });
  }

  /**
   * 批量获取项目详情
   */
  async batchGetDetails(items: Array<{
    id: string;
    type: 'movie' | 'tv';
  }>): Promise<any[]> {
    const configs = items.map(item => ({
      url: this.buildUrl(`/${item.type}/${item.id}`, {
        language: 'zh-CN'
      }),
      method: 'GET' as const,
      cache: true,
      cacheTTL: 30 * 60 * 1000,
      priority: 'normal' as const
    }));

    return this.optimizer.batchRequest(configs);
  }

  /**
   * 预加载热门内容
   */
  async preloadPopularContent(): Promise<void> {
    const configs = [
      {
        url: this.buildUrl('/movie/popular', { language: 'zh-CN', page: 1 }),
        method: 'GET' as const,
        cache: true,
        cacheTTL: 60 * 60 * 1000, // 1小时缓存
        priority: 'low' as const
      },
      {
        url: this.buildUrl('/tv/popular', { language: 'zh-CN', page: 1 }),
        method: 'GET' as const,
        cache: true,
        cacheTTL: 60 * 60 * 1000,
        priority: 'low' as const
      },
      {
        url: this.buildUrl('/trending/all/day', { language: 'zh-CN' }),
        method: 'GET' as const,
        cache: true,
        cacheTTL: 60 * 60 * 1000,
        priority: 'low' as const
      }
    ];

    await this.optimizer.preload(configs);
  }

  /**
   * 获取性能统计
   */
  getStats() {
    return this.optimizer.getPerformanceStats();
  }

  /**
   * 清除TMDB缓存
   */
  async clearCache(): Promise<void> {
    await this.optimizer.clearCache('tmdb');
  }
}

// 导出单例实例
export const networkOptimizer = NetworkOptimizer.getInstance();
export const tmdbNetworkOptimizer = new TMDBNetworkOptimizer();