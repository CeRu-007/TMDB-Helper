/**
 * 任务调度器高级配置
 * 专门用于管理并发控制、冲突解决和智能调度
 */

export interface TaskSchedulerAdvancedConfig {
  // 冲突检测配置
  conflictDetection: {
    enabled: boolean;
    conflictWindowMs: number; // 冲突检测时间窗口（毫秒）
    maxAdjustments: number; // 最大调整次数
    adjustmentIntervalMs: number; // 调整间隔（毫秒）
    strictMode: boolean; // 严格模式
    considerPriority: boolean; // 考虑任务优先级
    considerTaskType: boolean; // 考虑任务类型
  };

  // 冲突解决配置
  conflictResolution: {
    enabled: boolean;
    defaultStrategy: 'stagger' | 'queue' | 'priority' | 'hybrid';
    staggerIntervalMs: number; // 错开时间间隔
    maxStaggerAttempts: number; // 最大错开尝试次数
    queueEnabled: boolean; // 是否启用队列策略
    priorityWeights: Record<string, number>; // 优先级权重
    adaptiveAdjustment: boolean; // 自适应调整
  };

  // 智能调度配置
  intelligentScheduling: {
    enabled: boolean;
    priorityBasedAdjustment: boolean; // 基于优先级的调整
    loadBalancing: boolean; // 负载均衡
    adaptiveDelay: boolean; // 自适应延迟
  };

  // 队列管理配置
  queueManagement: {
    enabled: boolean;
    maxQueueSize: number; // 最大队列大小
    queueTimeoutMs: number; // 队列超时时间
    batchProcessing: boolean; // 批量处理
    batchSize: number; // 批处理大小
  };

  // 并发控制配置
  concurrencyControl: {
    maxConcurrentTasks: number; // 最大并发任务数
    maxConcurrentPerType: Record<string, number>; // 每种类型的最大并发数
    resourceThrottling: boolean; // 资源节流
    dynamicScaling: boolean; // 动态扩缩容
  };

  // 监控和日志配置
  monitoring: {
    enableDetailedLogs: boolean; // 启用详细日志
    enableMetrics: boolean; // 启用指标收集
    enableAlerts: boolean; // 启用告警
    performanceTracking: boolean; // 性能跟踪
    conflictReporting: boolean; // 冲突报告
  };

  // 故障恢复配置
  failureRecovery: {
    enableAutoRetry: boolean; // 启用自动重试
    maxRetryAttempts: number; // 最大重试次数
    retryBackoffMs: number; // 重试退避时间
    circuitBreakerEnabled: boolean; // 熔断器
    healthCheckIntervalMs: number; // 健康检查间隔
  };
}

export class TaskSchedulerAdvancedConfigManager {
  private static instance: TaskSchedulerAdvancedConfigManager;
  private config: TaskSchedulerAdvancedConfig;
  private configKey = 'tmdb_helper_advanced_scheduler_config';

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeConfig();
  }

  /**
   * 异步初始化配置
   */
  private async initializeConfig(): Promise<void> {
    try {
      this.config = await this.loadConfig();
    } catch (error) {
      this.config = this.getDefaultConfig();
    }
  }

  public static getInstance(): TaskSchedulerAdvancedConfigManager {
    if (!TaskSchedulerAdvancedConfigManager.instance) {
      TaskSchedulerAdvancedConfigManager.instance =
        new TaskSchedulerAdvancedConfigManager();
    }
    return TaskSchedulerAdvancedConfigManager.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): TaskSchedulerAdvancedConfig {
    return {
      conflictDetection: {
        enabled: true,
        conflictWindowMs: 60000, // 1分钟
        maxAdjustments: 10,
        adjustmentIntervalMs: 30000, // 30秒
        strictMode: false,
        considerPriority: true,
        considerTaskType: true,
      },

      conflictResolution: {
        enabled: true,
        defaultStrategy: 'hybrid',
        staggerIntervalMs: 30000, // 30秒
        maxStaggerAttempts: 5,
        queueEnabled: true,
        priorityWeights: {
          urgent: 4,
          high: 3,
          normal: 2,
          low: 1,
        },
        adaptiveAdjustment: true,
      },

      intelligentScheduling: {
        enabled: true,
        priorityBasedAdjustment: true,
        loadBalancing: true,
        adaptiveDelay: true,
      },

      queueManagement: {
        enabled: true,
        maxQueueSize: 100,
        queueTimeoutMs: 30 * 60 * 1000, // 30分钟
        batchProcessing: false,
        batchSize: 5,
      },

      concurrencyControl: {
        maxConcurrentTasks: 3,
        maxConcurrentPerType: {
          daily: 2,
          weekly: 2,
          once: 1,
        },
        resourceThrottling: true,
        dynamicScaling: false,
      },

      monitoring: {
        enableDetailedLogs: true,
        enableMetrics: true,
        enableAlerts: false,
        performanceTracking: true,
        conflictReporting: true,
      },

      failureRecovery: {
        enableAutoRetry: true,
        maxRetryAttempts: 3,
        retryBackoffMs: 60000, // 1分钟
        circuitBreakerEnabled: false,
        healthCheckIntervalMs: 5 * 60 * 1000, // 5分钟
      },
    };
  }

  /**
   * 加载配置（现在使用服务端存储）
   */
  private async loadConfig(): Promise<TaskSchedulerAdvancedConfig> {
    try {
      // 检查是否在浏览器环境中
      if (typeof window === 'undefined') {
        // 服务端环境，返回默认配置
        return this.getDefaultConfig();
      }

      const response = await fetch(`/api/system/config?key=${this.configKey}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.value) {
          const parsedConfig = JSON.parse(data.value);
          // 合并默认配置以确保新字段存在
          return this.mergeWithDefaults(parsedConfig);
        }
      }
    } catch (error) {}

    return this.getDefaultConfig();
  }

  /**
   * 与默认配置合并
   */
  private mergeWithDefaults(config: Partial<TaskSchedulerAdvancedConfig>): TaskSchedulerAdvancedConfig {
    const defaultConfig = this.getDefaultConfig();

    // 深度合并配置
    const mergeDeep = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
      const result = { ...target };

      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          result[key] = mergeDeep(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }

      return result;
    };

    return mergeDeep(defaultConfig, config);
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
      }
    } catch (error) {}
  }

  /**
   * 获取配置
   */
  public getConfig(): TaskSchedulerAdvancedConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<TaskSchedulerAdvancedConfig>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...updates });
    this.saveConfig();
  }

  /**
   * 重置为默认配置
   */
  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  /**
   * 获取冲突检测配置
   */
  public getConflictDetectionConfig() {
    return this.config.conflictDetection;
  }

  /**
   * 获取冲突解决配置
   */
  public getConflictResolutionConfig() {
    return this.config.conflictResolution;
  }

  /**
   * 获取并发控制配置
   */
  public getConcurrencyControlConfig() {
    return this.config.concurrencyControl;
  }

  /**
   * 验证配置
   */
  public validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证冲突检测配置
    if (this.config.conflictDetection.conflictWindowMs < 1000) {
      errors.push('冲突检测时间窗口不能少于1秒');
    }
    if (
      this.config.conflictDetection.maxAdjustments < 1 ||
      this.config.conflictDetection.maxAdjustments > 50
    ) {
      errors.push('最大调整次数必须在1-50之间');
    }

    // 验证冲突解决配置
    if (this.config.conflictResolution.staggerIntervalMs < 5000) {
      warnings.push('错开时间间隔建议不少于5秒');
    }
    if (this.config.conflictResolution.maxStaggerAttempts > 10) {
      warnings.push('最大错开尝试次数过多可能影响性能');
    }

    // 验证并发控制配置
    if (
      this.config.concurrencyControl.maxConcurrentTasks < 1 ||
      this.config.concurrencyControl.maxConcurrentTasks > 20
    ) {
      errors.push('最大并发任务数必须在1-20之间');
    }

    // 验证队列管理配置
    if (
      this.config.queueManagement.maxQueueSize < 10 ||
      this.config.queueManagement.maxQueueSize > 1000
    ) {
      warnings.push('队列大小建议在10-1000之间');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// 导出单例实例
export const advancedConfigManager =
  TaskSchedulerAdvancedConfigManager.getInstance();
