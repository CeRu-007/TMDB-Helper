/**
 * AbortError 监控和诊断工具
 * 用于监控和分析 AbortError 的发生情况，提供诊断信息
 */

export interface AbortErrorEvent {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  operation: string;
  errorMessage: string;
  stackTrace?: string;
  userAgent: string;
  isTimeout: boolean;
  duration?: number;
  retryCount: number;
}

export interface AbortErrorStats {
  totalErrors: number;
  timeoutErrors: number;
  unexpectedAborts: number;
  mostFrequentUrls: Array<{ url: string; count: number }>;
  averageDuration: number;
  errorsByHour: Record<string, number>;
  lastError?: AbortErrorEvent;
}

export class AbortErrorMonitor {
  private static instance: AbortErrorMonitor;
  private errorHistory: AbortErrorEvent[] = [];
  private maxHistorySize = 100;
  private listeners: Set<(event: AbortErrorEvent) => void> = new Set();

  private constructor() {}

  public static getInstance(): AbortErrorMonitor {
    if (!AbortErrorMonitor.instance) {
      AbortErrorMonitor.instance = new AbortErrorMonitor();
    }
    return AbortErrorMonitor.instance;
  }

  /**
   * 记录 AbortError 事件
   */
  public recordAbortError(
    url: string,
    method: string,
    operation: string,
    error: Error,
    isTimeout: boolean = false,
    duration?: number,
    retryCount: number = 0
  ): void {
    const event: AbortErrorEvent = {
      id: `abort_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      url,
      method,
      operation,
      errorMessage: error.message,
      stackTrace: error.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      isTimeout,
      duration,
      retryCount
    };

    this.errorHistory.unshift(event);

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    console.error(`[AbortErrorMonitor] 记录 AbortError 事件:`, event);

    // 通知监听器
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[AbortErrorMonitor] 监听器执行失败:', error);
      }
    });

    // 如果错误频率过高，发出警告
    this.checkErrorFrequency();
  }

  /**
   * 添加错误监听器
   */
  public addListener(listener: (event: AbortErrorEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 移除错误监听器
   */
  public removeListener(listener: (event: AbortErrorEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 获取错误统计信息
   */
  public getStats(): AbortErrorStats {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp < oneHour);

    // 统计最频繁的URL
    const urlCounts = new Map<string, number>();
    this.errorHistory.forEach(event => {
      const count = urlCounts.get(event.url) || 0;
      urlCounts.set(event.url, count + 1);
    });

    const mostFrequentUrls = Array.from(urlCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 按小时统计错误
    const errorsByHour: Record<string, number> = {};
    this.errorHistory.forEach(event => {
      const hour = new Date(event.timestamp).getHours().toString();
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
    });

    // 计算平均持续时间
    const durationsWithValue = this.errorHistory
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!);
    const averageDuration = durationsWithValue.length > 0
      ? durationsWithValue.reduce((sum, d) => sum + d, 0) / durationsWithValue.length
      : 0;

    return {
      totalErrors: this.errorHistory.length,
      timeoutErrors: this.errorHistory.filter(e => e.isTimeout).length,
      unexpectedAborts: this.errorHistory.filter(e => !e.isTimeout).length,
      mostFrequentUrls,
      averageDuration,
      errorsByHour,
      lastError: this.errorHistory[0]
    };
  }

  /**
   * 获取错误历史
   */
  public getErrorHistory(): AbortErrorEvent[] {
    return [...this.errorHistory];
  }

  /**
   * 清理错误历史
   */
  public clearHistory(): void {
    this.errorHistory = [];
    console.log('[AbortErrorMonitor] 错误历史已清理');
  }

  /**
   * 检查错误频率
   */
  private checkErrorFrequency(): void {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp < fiveMinutes);

    if (recentErrors.length >= 10) {
      console.warn(`[AbortErrorMonitor] 警告：过去5分钟内发生了 ${recentErrors.length} 个 AbortError`);
      
      // 分析错误模式
      const timeoutCount = recentErrors.filter(e => e.isTimeout).length;
      const unexpectedCount = recentErrors.length - timeoutCount;
      
      if (timeoutCount > unexpectedCount) {
        console.warn('[AbortErrorMonitor] 主要是超时错误，可能需要增加超时时间或检查网络状况');
      } else {
        console.warn('[AbortErrorMonitor] 主要是意外中止错误，可能存在系统或浏览器问题');
      }
    }
  }

  /**
   * 生成诊断报告
   */
  public generateDiagnosticReport(): string {
    const stats = this.getStats();
    const report = [];

    report.push('=== AbortError 诊断报告 ===');
    report.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    report.push('');

    report.push('## 总体统计');
    report.push(`总错误数: ${stats.totalErrors}`);
    report.push(`超时错误: ${stats.timeoutErrors}`);
    report.push(`意外中止: ${stats.unexpectedAborts}`);
    report.push(`平均持续时间: ${stats.averageDuration.toFixed(2)}ms`);
    report.push('');

    if (stats.mostFrequentUrls.length > 0) {
      report.push('## 最频繁出错的URL');
      stats.mostFrequentUrls.forEach(({ url, count }) => {
        report.push(`${count}次: ${url}`);
      });
      report.push('');
    }

    if (stats.lastError) {
      report.push('## 最近错误');
      report.push(`时间: ${new Date(stats.lastError.timestamp).toLocaleString('zh-CN')}`);
      report.push(`URL: ${stats.lastError.url}`);
      report.push(`操作: ${stats.lastError.operation}`);
      report.push(`错误: ${stats.lastError.errorMessage}`);
      report.push(`是否超时: ${stats.lastError.isTimeout ? '是' : '否'}`);
      report.push('');
    }

    report.push('## 建议');
    if (stats.timeoutErrors > stats.unexpectedAborts) {
      report.push('- 主要是超时错误，建议检查网络连接或增加超时时间');
      report.push('- 考虑实现更智能的重试机制');
    } else if (stats.unexpectedAborts > 0) {
      report.push('- 存在意外中止错误，可能是浏览器或系统限制');
      report.push('- 建议检查请求频率和并发数量');
    }

    if (stats.totalErrors > 50) {
      report.push('- 错误数量较多，建议进行系统优化');
    }

    return report.join('\n');
  }

  /**
   * 导出错误数据
   */
  public exportErrorData(): string {
    const exportData = {
      stats: this.getStats(),
      history: this.errorHistory,
      exportTime: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 检查当前环境的 AbortController 支持
   */
  public checkAbortControllerSupport(): {
    supported: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查 AbortController 支持
    if (typeof AbortController === 'undefined') {
      issues.push('AbortController 不受支持');
      recommendations.push('考虑使用 polyfill 或降级方案');
    }

    // 检查 fetch 支持
    if (typeof fetch === 'undefined') {
      issues.push('fetch API 不受支持');
      recommendations.push('使用 fetch polyfill');
    }

    // 检查浏览器版本（简单检查）
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Chrome/') && parseInt(userAgent.split('Chrome/')[1]) < 66) {
        issues.push('Chrome 版本过低，AbortController 支持可能不完整');
        recommendations.push('建议升级到 Chrome 66+');
      }
    }

    return {
      supported: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// 导出单例实例
export const abortErrorMonitor = AbortErrorMonitor.getInstance();

// 自动设置全局错误监听（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof Error && 
        (event.reason.name === 'AbortError' || event.reason.message.includes('aborted'))) {
      abortErrorMonitor.recordAbortError(
        window.location.href,
        'unknown',
        'unhandled_rejection',
        event.reason,
        false
      );
    }
  });
}
