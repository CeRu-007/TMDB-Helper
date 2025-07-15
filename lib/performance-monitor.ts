/**
 * 性能监控器
 * 监控任务执行性能、系统资源使用情况和错误统计
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface TaskExecutionMetrics {
  taskId: string;
  taskName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  error?: string;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage?: number;
}

export interface SystemMetrics {
  timestamp: string;
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  storage: {
    used: number;
    quota: number;
    percentage: number;
  };
  tasks: {
    total: number;
    running: number;
    queued: number;
    failed: number;
  };
  locks: {
    active: number;
    expired: number;
  };
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
    duration: number;
  };
  summary: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
    errorRate: number;
  };
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  performanceTrends: {
    executionTimes: number[];
    memoryUsage: number[];
    errorRates: number[];
  };
  recommendations: string[];
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private taskMetrics: Map<string, TaskExecutionMetrics> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly MAX_SYSTEM_METRICS = 100;

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 启动性能监控
   */
  public startMonitoring(interval: number = 30000): void {
    if (this.isMonitoring) {
      console.log('[PerformanceMonitor] 监控已在运行中');
      return;
    }

    console.log(`[PerformanceMonitor] 启动性能监控，间隔: ${interval}ms`);
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, interval);

    // 页面卸载时停止监控
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.stopMonitoring();
      });
    }
  }

  /**
   * 停止性能监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[PerformanceMonitor] 停止性能监控');
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * 记录性能指标
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(fullMetric);

    // 限制历史记录数量
    if (metricHistory.length > this.MAX_METRICS_HISTORY) {
      metricHistory.shift();
    }
  }

  /**
   * 开始任务执行监控
   */
  public startTaskExecution(taskId: string, taskName: string): void {
    const metrics: TaskExecutionMetrics = {
      taskId,
      taskName,
      startTime: new Date().toISOString(),
      status: 'running'
    };

    // 记录内存使用情况
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    this.taskMetrics.set(taskId, metrics);

    // 记录任务开始指标
    this.recordMetric({
      id: `task_start_${taskId}`,
      name: 'task_started',
      type: 'counter',
      value: 1,
      tags: { taskId, taskName }
    });

    console.log(`[PerformanceMonitor] 开始监控任务: ${taskName} (${taskId})`);
  }

  /**
   * 结束任务执行监控
   */
  public endTaskExecution(
    taskId: string, 
    status: TaskExecutionMetrics['status'], 
    error?: string
  ): void {
    const metrics = this.taskMetrics.get(taskId);
    if (!metrics) {
      console.warn(`[PerformanceMonitor] 未找到任务监控数据: ${taskId}`);
      return;
    }

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(metrics.startTime).getTime();

    // 更新任务指标
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.status = status;
    if (error) {
      metrics.error = error;
    }

    // 记录最终内存使用情况
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    // 记录性能指标
    this.recordMetric({
      id: `task_duration_${taskId}`,
      name: 'task_duration',
      type: 'timer',
      value: duration,
      tags: { taskId, taskName: metrics.taskName, status }
    });

    this.recordMetric({
      id: `task_end_${taskId}`,
      name: 'task_completed',
      type: 'counter',
      value: 1,
      tags: { taskId, taskName: metrics.taskName, status }
    });

    if (metrics.memoryUsage) {
      this.recordMetric({
        id: `task_memory_${taskId}`,
        name: 'task_memory_usage',
        type: 'gauge',
        value: metrics.memoryUsage.percentage,
        tags: { taskId, taskName: metrics.taskName }
      });
    }

    console.log(`[PerformanceMonitor] 任务监控结束: ${metrics.taskName} (${taskId}), 状态: ${status}, 耗时: ${duration}ms`);
  }

  /**
   * 收集系统指标
   */
  private collectSystemMetrics(): void {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        memory: this.getMemoryMetrics(),
        storage: this.getStorageMetrics(),
        tasks: this.getTaskMetrics(),
        locks: this.getLockMetrics()
      };

      this.systemMetrics.push(metrics);

      // 限制系统指标历史记录
      if (this.systemMetrics.length > this.MAX_SYSTEM_METRICS) {
        this.systemMetrics.shift();
      }

      // 记录系统指标
      this.recordMetric({
        id: 'system_memory',
        name: 'system_memory_usage',
        type: 'gauge',
        value: metrics.memory.percentage
      });

      this.recordMetric({
        id: 'system_storage',
        name: 'system_storage_usage',
        type: 'gauge',
        value: metrics.storage.percentage
      });

      this.recordMetric({
        id: 'system_tasks_running',
        name: 'system_tasks_running',
        type: 'gauge',
        value: metrics.tasks.running
      });

    } catch (error) {
      console.error('[PerformanceMonitor] 收集系统指标失败:', error);
    }
  }

  /**
   * 获取内存指标
   */
  private getMemoryMetrics(): SystemMetrics['memory'] {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        available: memory.totalJSHeapSize - memory.usedJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    return {
      used: 0,
      total: 0,
      available: 0,
      percentage: 0
    };
  }

  /**
   * 获取存储指标
   */
  private getStorageMetrics(): SystemMetrics['storage'] {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        // 这是异步的，这里只能返回估算值
        return {
          used: 0,
          quota: 0,
          percentage: 0
        };
      }

      // 估算localStorage使用量
      let used = 0;
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            used += localStorage[key].length + key.length;
          }
        }
      }

      const quota = 5 * 1024 * 1024; // 假设5MB配额
      return {
        used,
        quota,
        percentage: (used / quota) * 100
      };

    } catch (error) {
      return {
        used: 0,
        quota: 0,
        percentage: 0
      };
    }
  }

  /**
   * 获取任务指标
   */
  private getTaskMetrics(): SystemMetrics['tasks'] {
    const runningTasks = Array.from(this.taskMetrics.values()).filter(t => t.status === 'running');
    const allTasks = Array.from(this.taskMetrics.values());
    const failedTasks = allTasks.filter(t => t.status === 'failed');

    return {
      total: allTasks.length,
      running: runningTasks.length,
      queued: 0, // 暂时没有队列概念
      failed: failedTasks.length
    };
  }

  /**
   * 获取锁指标
   */
  private getLockMetrics(): SystemMetrics['locks'] {
    // 这里需要与DistributedLock集成
    return {
      active: 0,
      expired: 0
    };
  }

  /**
   * 获取性能报告
   */
  public async generatePerformanceReport(
    startTime?: string,
    endTime?: string
  ): Promise<PerformanceReport> {
    const start = startTime ? new Date(startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
    const end = endTime ? new Date(endTime) : new Date();

    // 过滤时间范围内的任务
    const tasksInPeriod = Array.from(this.taskMetrics.values()).filter(task => {
      const taskTime = new Date(task.startTime);
      return taskTime >= start && taskTime <= end && task.endTime;
    });

    // 计算汇总统计
    const totalTasks = tasksInPeriod.length;
    const successfulTasks = tasksInPeriod.filter(t => t.status === 'success').length;
    const failedTasks = tasksInPeriod.filter(t => t.status === 'failed').length;
    const executionTimes = tasksInPeriod.map(t => t.duration || 0);
    const averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
      : 0;
    const totalExecutionTime = executionTimes.reduce((a, b) => a + b, 0);
    const errorRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;

    // 统计错误类型
    const errorCounts = new Map<string, number>();
    tasksInPeriod.filter(t => t.error).forEach(task => {
      const error = task.error!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / failedTasks) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 生成性能趋势数据
    const performanceTrends = {
      executionTimes: executionTimes.slice(-50), // 最近50个任务
      memoryUsage: this.systemMetrics.slice(-50).map(m => m.memory.percentage),
      errorRates: this.calculateErrorRatesTrend(tasksInPeriod)
    };

    // 生成建议
    const recommendations = this.generateRecommendations({
      totalTasks,
      successfulTasks,
      failedTasks,
      averageExecutionTime,
      errorRate,
      executionTimes,
      memoryUsage: this.systemMetrics.slice(-10).map(m => m.memory.percentage)
    });

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        duration: end.getTime() - start.getTime()
      },
      summary: {
        totalTasks,
        successfulTasks,
        failedTasks,
        averageExecutionTime,
        totalExecutionTime,
        errorRate
      },
      topErrors,
      performanceTrends,
      recommendations
    };
  }

  /**
   * 计算错误率趋势
   */
  private calculateErrorRatesTrend(tasks: TaskExecutionMetrics[]): number[] {
    const hourlyBuckets = new Map<number, { total: number; failed: number }>();
    
    tasks.forEach(task => {
      const hour = Math.floor(new Date(task.startTime).getTime() / (60 * 60 * 1000));
      if (!hourlyBuckets.has(hour)) {
        hourlyBuckets.set(hour, { total: 0, failed: 0 });
      }
      const bucket = hourlyBuckets.get(hour)!;
      bucket.total++;
      if (task.status === 'failed') {
        bucket.failed++;
      }
    });

    return Array.from(hourlyBuckets.values())
      .map(bucket => bucket.total > 0 ? (bucket.failed / bucket.total) * 100 : 0)
      .slice(-24); // 最近24小时
  }

  /**
   * 生成性能建议
   */
  private generateRecommendations(stats: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    errorRate: number;
    executionTimes: number[];
    memoryUsage: number[];
  }): string[] {
    const recommendations: string[] = [];

    // 错误率建议
    if (stats.errorRate > 20) {
      recommendations.push('错误率过高（>20%），建议检查任务配置和网络连接');
    } else if (stats.errorRate > 10) {
      recommendations.push('错误率较高（>10%），建议优化错误处理机制');
    }

    // 执行时间建议
    if (stats.averageExecutionTime > 5 * 60 * 1000) { // 5分钟
      recommendations.push('平均执行时间过长（>5分钟），建议优化任务逻辑或增加超时设置');
    }

    // 执行时间变化建议
    if (stats.executionTimes.length > 10) {
      const recentTimes = stats.executionTimes.slice(-10);
      const earlierTimes = stats.executionTimes.slice(-20, -10);
      const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
      const earlierAvg = earlierTimes.reduce((a, b) => a + b, 0) / earlierTimes.length;
      
      if (recentAvg > earlierAvg * 1.5) {
        recommendations.push('任务执行时间呈上升趋势，建议检查系统性能');
      }
    }

    // 内存使用建议
    const avgMemoryUsage = stats.memoryUsage.reduce((a, b) => a + b, 0) / stats.memoryUsage.length;
    if (avgMemoryUsage > 80) {
      recommendations.push('内存使用率过高（>80%），建议优化内存管理');
    } else if (avgMemoryUsage > 60) {
      recommendations.push('内存使用率较高（>60%），建议监控内存泄漏');
    }

    // 任务频率建议
    if (stats.totalTasks === 0) {
      recommendations.push('没有任务执行记录，请检查任务调度是否正常');
    } else if (stats.totalTasks < 5) {
      recommendations.push('任务执行频率较低，建议检查任务配置');
    }

    // 默认建议
    if (recommendations.length === 0) {
      recommendations.push('系统运行正常，建议继续监控性能指标');
    }

    return recommendations;
  }

  /**
   * 获取实时性能数据
   */
  public getRealTimeMetrics(): {
    currentTasks: TaskExecutionMetrics[];
    systemMetrics: SystemMetrics | null;
    recentMetrics: PerformanceMetric[];
  } {
    const runningTasks = Array.from(this.taskMetrics.values()).filter(t => t.status === 'running');
    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1] || null;
    const recentMetrics: PerformanceMetric[] = [];

    // 获取最近的指标
    for (const [name, metrics] of this.metrics.entries()) {
      const recent = metrics.slice(-5); // 最近5个
      recentMetrics.push(...recent);
    }

    // 按时间排序
    recentMetrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      currentTasks: runningTasks,
      systemMetrics: latestSystemMetrics,
      recentMetrics: recentMetrics.slice(0, 20) // 最近20个指标
    };
  }

  /**
   * 清理历史数据
   */
  public cleanupOldData(retentionDays: number = 7): void {
    const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // 清理任务指标
    for (const [taskId, metrics] of this.taskMetrics.entries()) {
      if (new Date(metrics.startTime) < cutoffTime && metrics.status !== 'running') {
        this.taskMetrics.delete(taskId);
      }
    }

    // 清理性能指标
    for (const [name, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => new Date(m.timestamp) >= cutoffTime);
      this.metrics.set(name, filteredMetrics);
    }

    // 清理系统指标
    this.systemMetrics = this.systemMetrics.filter(m => new Date(m.timestamp) >= cutoffTime);

    console.log(`[PerformanceMonitor] 清理了 ${retentionDays} 天前的历史数据`);
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();