/**
 * 配置管理器
 * 支持运行时配置修改和持久化存储
 */

export interface TaskSchedulerConfig {
  // 时间间隔配置
  syncInterval: number; // 同步间隔（毫秒）
  validationInterval: number; // 验证间隔（毫秒）
  missedTaskCheckInterval: number; // 错过任务检查间隔（毫秒）
  cleanupInterval: number; // 清理间隔（毫秒）

  // 超时配置
  taskExecutionTimeout: number; // 任务执行超时（毫秒）
  lockTimeout: number; // 锁超时时间（毫秒）
  apiTimeout: number; // API请求超时（毫秒）

  // 重试配置
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟（毫秒）
  backoffMultiplier: number; // 退避乘数

  // 补偿窗口配置
  missedTaskWindow: number; // 错过任务补偿窗口（毫秒）
  minExecutionDelay: number; // 最小执行延迟（毫秒）

  // 存储配置
  storageQuota: number; // 存储配额（字节）
  maxLogEntries: number; // 最大日志条目数
  dataRetentionDays: number; // 数据保留天数

  // 调试配置
  enableDebugLogs: boolean; // 启用调试日志
  enablePerformanceMonitoring: boolean; // 启用性能监控
  enableErrorReporting: boolean; // 启用错误报告

  // 安全配置
  enableConcurrencyControl: boolean; // 启用并发控制
  maxConcurrentTasks: number; // 最大并发任务数
  enableDataValidation: boolean; // 启用数据验证
}

export class ConfigManager {
  private static readonly CONFIG_KEY = 'tmdb_helper_config';
  private static readonly CONFIG_VERSION = '1.0.0';
  private static instance: ConfigManager;
  private config: TaskSchedulerConfig;
  private listeners: Map<string, Array<(config: TaskSchedulerConfig) => void>> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): TaskSchedulerConfig {
    return {
      // 时间间隔配置（毫秒）
      syncInterval: 5 * 60 * 1000, // 5分钟
      validationInterval: 60 * 60 * 1000, // 1小时
      missedTaskCheckInterval: 10 * 60 * 1000, // 10分钟
      cleanupInterval: 60 * 60 * 1000, // 1小时

      // 超时配置（毫秒）
      taskExecutionTimeout: 10 * 60 * 1000, // 10分钟
      lockTimeout: 5 * 60 * 1000, // 5分钟
      apiTimeout: 3 * 60 * 1000, // 3分钟

      // 重试配置
      maxRetries: 3,
      retryDelay: 5000, // 5秒
      backoffMultiplier: 2,

      // 补偿窗口配置（毫秒）
      missedTaskWindow: 24 * 60 * 60 * 1000, // 24小时
      minExecutionDelay: 10 * 1000, // 10秒

      // 存储配置
      storageQuota: 50 * 1024 * 1024, // 50MB
      maxLogEntries: 1000,
      dataRetentionDays: 30,

      // 调试配置
      enableDebugLogs: false,
      enablePerformanceMonitoring: true,
      enableErrorReporting: true,

      // 安全配置
      enableConcurrencyControl: true,
      maxConcurrentTasks: 3,
      enableDataValidation: true
    };
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedConfig = localStorage.getItem(ConfigManager.CONFIG_KEY);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);

          // 验证配置版本
          if (parsed.version === ConfigManager.CONFIG_VERSION) {
            this.config = { ...this.getDefaultConfig(), ...parsed.config };
            console.log('[ConfigManager] 已加载保存的配置');
          } else {
            console.log('[ConfigManager] 配置版本不匹配，使用默认配置');
            this.saveConfig();
          }
        } else {
          console.log('[ConfigManager] 未找到保存的配置，使用默认配置');
          this.saveConfig();
        }
      }
    } catch (error) {
      console.error('[ConfigManager] 加载配置失败，使用默认配置:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 保存配置（现在使用服务端存储）
   */
  private async saveConfig(): Promise<void> {
    try {
      const configData = {
        version: ConfigManager.CONFIG_VERSION,
        config: this.config,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set',
          key: 'task_scheduler_config',
          value: JSON.stringify(configData)
        })
      });

      if (response.ok) {
        console.log('[ConfigManager] 配置已保存到服务端');
      } else {
        console.error('[ConfigManager] 保存配置到服务端失败');
      }
    } catch (error) {
      console.error('[ConfigManager] 保存配置失败:', error);
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): TaskSchedulerConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置项
   */
  public get<K extends keyof TaskSchedulerConfig>(key: K): TaskSchedulerConfig[K] {
    return this.config[key];
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<TaskSchedulerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // 验证配置
    const validation = this.validateConfig(this.config);
    if (!validation.isValid) {
      console.error('[ConfigManager] 配置验证失败:', validation.errors);
      this.config = oldConfig; // 回滚
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }

    // 保存配置
    this.saveConfig();

    // 通知监听器
    this.notifyListeners(this.config);

    console.log('[ConfigManager] 配置已更新:', updates);
  }

  /**
   * 重置为默认配置
   */
  public resetToDefault(): void {
    const defaultConfig = this.getDefaultConfig();
    this.updateConfig(defaultConfig);
    console.log('[ConfigManager] 配置已重置为默认值');
  }

  /**
   * 验证配置
   */
  private validateConfig(config: TaskSchedulerConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证时间间隔
    if (config.syncInterval < 60000) { // 最小1分钟
      errors.push('同步间隔不能少于1分钟');
    }
    if (config.validationInterval < 300000) { // 最小5分钟
      errors.push('验证间隔不能少于5分钟');
    }
    if (config.missedTaskCheckInterval < 60000) { // 最小1分钟
      errors.push('错过任务检查间隔不能少于1分钟');
    }

    // 验证超时配置
    if (config.taskExecutionTimeout < 60000) { // 最小1分钟
      errors.push('任务执行超时不能少于1分钟');
    }
    if (config.lockTimeout < 30000) { // 最小30秒
      errors.push('锁超时时间不能少于30秒');
    }
    if (config.apiTimeout < 10000) { // 最小10秒
      errors.push('API超时时间不能少于10秒');
    }

    // 验证重试配置
    if (config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('最大重试次数必须在0-10之间');
    }
    if (config.retryDelay < 1000) { // 最小1秒
      errors.push('重试延迟不能少于1秒');
    }
    if (config.backoffMultiplier < 1 || config.backoffMultiplier > 5) {
      errors.push('退避乘数必须在1-5之间');
    }

    // 验证存储配置
    if (config.storageQuota < 1024 * 1024) { // 最小1MB
      warnings.push('存储配额少于1MB，可能不够用');
    }
    if (config.maxLogEntries < 100) {
      warnings.push('最大日志条目数少于100，可能影响调试');
    }
    if (config.dataRetentionDays < 1) {
      errors.push('数据保留天数不能少于1天');
    }

    // 验证并发配置
    if (config.maxConcurrentTasks < 1 || config.maxConcurrentTasks > 10) {
      errors.push('最大并发任务数必须在1-10之间');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 添加配置变更监听器
   */
  public addListener(key: string, callback: (config: TaskSchedulerConfig) => void): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(callback);
  }

  /**
   * 移除配置变更监听器
   */
  public removeListener(key: string, callback?: (config: TaskSchedulerConfig) => void): void {
    if (!this.listeners.has(key)) {
      return;
    }

    if (callback) {
      const callbacks = this.listeners.get(key)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(key);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(config: TaskSchedulerConfig): void {
    for (const [key, callbacks] of this.listeners.entries()) {
      callbacks.forEach(callback => {
        try {
          callback(config);
        } catch (error) {
          console.error(`[ConfigManager] 通知监听器 ${key} 时出错:`, error);
        }
      });
    }
  }

  /**
   * 导出配置
   */
  public exportConfig(): string {
    const exportData = {
      version: ConfigManager.CONFIG_VERSION,
      config: this.config,
      exportedAt: new Date().toISOString(),
      exportedBy: 'ConfigManager'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导入配置
   */
  public importConfig(configJson: string): void {
    try {
      const importData = JSON.parse(configJson);

      if (!importData.config) {
        throw new Error('无效的配置格式');
      }

      // 验证导入的配置
      const validation = this.validateConfig(importData.config);
      if (!validation.isValid) {
        throw new Error(`导入的配置无效: ${validation.errors.join(', ')}`);
      }

      // 应用配置
      this.updateConfig(importData.config);
      console.log('[ConfigManager] 配置导入成功');

      if (validation.warnings.length > 0) {
        console.warn('[ConfigManager] 配置导入警告:', validation.warnings);
      }

    } catch (error) {
      console.error('[ConfigManager] 配置导入失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置统计信息
   */
  public getConfigStats(): {
    totalSettings: number;
    customizedSettings: number;
    defaultSettings: number;
    lastUpdated: string | null;
  } {
    const defaultConfig = this.getDefaultConfig();
    const currentConfig = this.config;

    let customizedCount = 0;
    const totalCount = Object.keys(defaultConfig).length;

    for (const key in defaultConfig) {
      if (defaultConfig[key as keyof TaskSchedulerConfig] !== currentConfig[key as keyof TaskSchedulerConfig]) {
        customizedCount++;
      }
    }

    let lastUpdated: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedConfig = localStorage.getItem(ConfigManager.CONFIG_KEY);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          lastUpdated = parsed.updatedAt || null;
        }
      }
    } catch (error) {
      // 忽略错误
    }

    return {
      totalSettings: totalCount,
      customizedSettings: customizedCount,
      defaultSettings: totalCount - customizedCount,
      lastUpdated
    };
  }

  /**
   * 获取性能相关配置
   */
  public getPerformanceConfig(): {
    intervals: Record<string, number>;
    timeouts: Record<string, number>;
    limits: Record<string, number>;
  } {
    return {
      intervals: {
        sync: this.config.syncInterval,
        validation: this.config.validationInterval,
        missedTaskCheck: this.config.missedTaskCheckInterval,
        cleanup: this.config.cleanupInterval
      },
      timeouts: {
        taskExecution: this.config.taskExecutionTimeout,
        lock: this.config.lockTimeout,
        api: this.config.apiTimeout
      },
      limits: {
        maxRetries: this.config.maxRetries,
        maxConcurrentTasks: this.config.maxConcurrentTasks,
        maxLogEntries: this.config.maxLogEntries,
        storageQuota: this.config.storageQuota
      }
    };
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();