/**
 * Chunk 加载监控工具
 * 监控和诊断 webpack chunk 加载问题，特别是 ChunkLoadError
 */

'use client';

export interface ChunkLoadEvent {
  id: string;
  timestamp: number;
  chunkName?: string;
  chunkId?: string;
  url?: string;
  error?: string;
  loadTime?: number;
  retryCount: number;
  success: boolean;
}

export interface ChunkLoadStats {
  totalAttempts: number;
  successfulLoads: number;
  failedLoads: number;
  averageLoadTime: number;
  mostProblematicChunks: Array<{ chunk: string; failures: number }>;
  errorsByType: Record<string, number>;
  lastError?: ChunkLoadEvent;
}

export class ChunkLoadMonitor {
  private static instance: ChunkLoadMonitor;
  private loadHistory: ChunkLoadEvent[] = [];
  private maxHistorySize = 50;
  private listeners: Set<(event: ChunkLoadEvent) => void> = new Set();
  private originalWebpackRequire?: unknown;

  private constructor() {
    this.setupWebpackMonitoring();
    this.setupGlobalErrorHandling();
  }

  public static getInstance(): ChunkLoadMonitor {
    if (!ChunkLoadMonitor.instance) {
      ChunkLoadMonitor.instance = new ChunkLoadMonitor();
    }
    return ChunkLoadMonitor.instance;
  }

  /**
   * 设置 webpack 监控
   */
  private setupWebpackMonitoring(): void {
    if (typeof window === 'undefined') return;

    // 监控 webpack 的 chunk 加载
    const originalRequire = (window as any).__webpack_require__;
    if (originalRequire && originalRequire.f && originalRequire.f.j) {
      this.originalWebpackRequire = originalRequire.f.j;
      
      (window as any).__webpack_require__.f.j = (chunkId: string, promises: Promise<any>[]) => {
        const startTime = Date.now();

        // 调用原始的 chunk 加载函数
        const result = this.originalWebpackRequire.call(this, chunkId, promises);
        
        // 监控 promises 的结果
        if (promises && promises.length > 0) {
          const lastPromise = promises[promises.length - 1];
          if (lastPromise && typeof lastPromise.then === 'function') {
            lastPromise
              .then(() => {
                const loadTime = Date.now() - startTime;
                this.recordChunkLoad({
                  chunkId,
                  success: true,
                  loadTime,
                  retryCount: 0
                });
              })
              .catch((error: Error) => {
                const loadTime = Date.now() - startTime;
                this.recordChunkLoad({
                  chunkId,
                  success: false,
                  loadTime,
                  error: error.message,
                  retryCount: 0
                });
              });
          }
        }
        
        return result;
      };
    }
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // 监听未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof Error) {
        const error = event.reason;
        
        if (this.isChunkLoadError(error)) {
          
          this.recordChunkLoad({
            success: false,
            error: error.message,
            retryCount: 0
          });
        }
      }
    });

    // 监听脚本加载错误
    window.addEventListener('error', (event) => {
      if (event.target && (event.target as any).tagName === 'SCRIPT') {
        const script = event.target as HTMLScriptElement;
        const url = script.src;
        
        if (url && this.isWebpackChunk(url)) {
          
          this.recordChunkLoad({
            url,
            success: false,
            error: `Script load failed: ${url}`,
            retryCount: 0
          });
        }
      }
    }, true);
  }

  /**
   * 记录 chunk 加载事件
   */
  private recordChunkLoad(data: Partial<ChunkLoadEvent>): void {
    const event: ChunkLoadEvent = {
      id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      chunkName: data.chunkName,
      chunkId: data.chunkId,
      url: data.url,
      error: data.error,
      loadTime: data.loadTime,
      retryCount: data.retryCount || 0,
      success: data.success || false
    };

    this.loadHistory.unshift(event);

    // 限制历史记录大小
    if (this.loadHistory.length > this.maxHistorySize) {
      this.loadHistory = this.loadHistory.slice(0, this.maxHistorySize);
    }

    // 通知监听器
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        
      }
    });
  }

  /**
   * 检查是否是 ChunkLoadError
   */
  private isChunkLoadError(error: Error): boolean {
    return error.name === 'ChunkLoadError' ||
           error.message.includes('Loading chunk') ||
           error.message.includes('Loading CSS chunk') ||
           error.message.includes('ChunkLoadError');
  }

  /**
   * 检查是否是 webpack chunk URL
   */
  private isWebpackChunk(url: string): boolean {
    return url.includes('/_next/static/chunks/') ||
           url.includes('.js') && (url.includes('chunk') || url.includes('_next'));
  }

  /**
   * 添加监听器
   */
  public addListener(listener: (event: ChunkLoadEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 移除监听器
   */
  public removeListener(listener: (event: ChunkLoadEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 获取加载统计
   */
  public getStats(): ChunkLoadStats {
    const totalAttempts = this.loadHistory.length;
    const successfulLoads = this.loadHistory.filter(e => e.success).length;
    const failedLoads = totalAttempts - successfulLoads;

    // 计算平均加载时间
    const loadTimes = this.loadHistory
      .filter(e => e.loadTime !== undefined)
      .map(e => e.loadTime!);
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
      : 0;

    // 统计最有问题的 chunks
    const chunkFailures = new Map<string, number>();
    this.loadHistory
      .filter(e => !e.success && (e.chunkId || e.chunkName))
      .forEach(e => {
        const chunk = e.chunkId || e.chunkName || 'unknown';
        chunkFailures.set(chunk, (chunkFailures.get(chunk) || 0) + 1);
      });

    const mostProblematicChunks = Array.from(chunkFailures.entries())
      .map(([chunk, failures]) => ({ chunk, failures }))
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 5);

    // 按错误类型统计
    const errorsByType: Record<string, number> = {};
    this.loadHistory
      .filter(e => !e.success && e.error)
      .forEach(e => {
        const errorType = this.categorizeError(e.error!);
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      });

    return {
      totalAttempts,
      successfulLoads,
      failedLoads,
      averageLoadTime,
      mostProblematicChunks,
      errorsByType,
      lastError: this.loadHistory.find(e => !e.success)
    };
  }

  /**
   * 分类错误类型
   */
  private categorizeError(error: string): string {
    if (error.includes('Loading chunk')) return 'ChunkLoadError';
    if (error.includes('Script load failed')) return 'ScriptLoadError';
    if (error.includes('Network')) return 'NetworkError';
    if (error.includes('timeout')) return 'TimeoutError';
    return 'OtherError';
  }

  /**
   * 获取加载历史
   */
  public getLoadHistory(): ChunkLoadEvent[] {
    return [...this.loadHistory];
  }

  /**
   * 清理历史记录
   */
  public clearHistory(): void {
    this.loadHistory = [];
    
  }

  /**
   * 生成诊断报告
   */
  public generateDiagnosticReport(): string {
    const stats = this.getStats();
    const report = [];

    report.push('=== Chunk 加载诊断报告 ===');
    report.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    report.push('');

    report.push('## 总体统计');
    report.push(`总加载尝试: ${stats.totalAttempts}`);
    report.push(`成功加载: ${stats.successfulLoads}`);
    report.push(`失败加载: ${stats.failedLoads}`);
    report.push(`成功率: ${stats.totalAttempts > 0 ? ((stats.successfulLoads / stats.totalAttempts) * 100).toFixed(2) : 0}%`);
    report.push(`平均加载时间: ${stats.averageLoadTime.toFixed(2)}ms`);
    report.push('');

    if (stats.mostProblematicChunks.length > 0) {
      report.push('## 最有问题的 Chunks');
      stats.mostProblematicChunks.forEach(({ chunk, failures }) => {
        report.push(`${failures}次失败: ${chunk}`);
      });
      report.push('');
    }

    if (Object.keys(stats.errorsByType).length > 0) {
      report.push('## 错误类型分布');
      Object.entries(stats.errorsByType).forEach(([type, count]) => {
        report.push(`${type}: ${count}次`);
      });
      report.push('');
    }

    if (stats.lastError) {
      report.push('## 最近错误');
      report.push(`时间: ${new Date(stats.lastError.timestamp).toLocaleString('zh-CN')}`);
      report.push(`Chunk: ${stats.lastError.chunkId || stats.lastError.chunkName || 'unknown'}`);
      report.push(`错误: ${stats.lastError.error}`);
      report.push('');
    }

    report.push('## 建议');
    if (stats.failedLoads > stats.successfulLoads) {
      report.push('- 失败率较高，建议检查网络连接和服务器状态');
      report.push('- 考虑优化 webpack 配置，减少 chunk 数量');
    }
    if (stats.averageLoadTime > 5000) {
      report.push('- 平均加载时间较长，建议优化 chunk 大小');
    }
    if (stats.mostProblematicChunks.length > 0) {
      report.push('- 存在特定 chunk 反复失败，建议检查这些模块的依赖关系');
    }

    return report.join('\n');
  }
}

// 导出单例实例
export const chunkLoadMonitor = ChunkLoadMonitor.getInstance();

// 自动启动监控（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  // 延迟启动，确保 webpack 已经初始化
  setTimeout(() => {
    chunkLoadMonitor; // 触发实例化
  }, 100);
}
