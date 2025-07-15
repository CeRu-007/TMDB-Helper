/**
 * 配置管理系统
 * 统一管理应用配置、环境变量和用户设置
 */

import { log } from './logger'
import { handleError } from './error-handler'

export interface AppConfig {
  // API配置
  api: {
    tmdb: {
      baseUrl: string
      timeout: number
      retries: number
      rateLimit: {
        requests: number
        window: number // 毫秒
      }
    }
    local: {
      baseUrl: string
      timeout: number
    }
  }
  
  // 存储配置
  storage: {
    useFileStorage: boolean
    autoBackup: boolean
    backupInterval: number // 毫秒
    maxBackups: number
    compressionEnabled: boolean
  }
  
  // 性能配置
  performance: {
    enableMetrics: boolean
    metricsInterval: number // 毫秒
    memoryCheckInterval: number // 毫秒
    maxLogEntries: number
    enableResourceCleanup: boolean
  }
  
  // UI配置
  ui: {
    theme: 'light' | 'dark' | 'system'
    layout: 'original' | 'sidebar'
    language: 'zh-CN' | 'en-US'
    animations: boolean
    compactMode: boolean
    showDebugInfo: boolean
  }
  
  // 功能开关
  features: {
    enableScheduledTasks: boolean
    enableImageProcessing: boolean
    enableDataValidation: boolean
    enableErrorReporting: boolean
    enableAnalytics: boolean
    betaFeatures: boolean
  }
  
  // 开发配置
  development: {
    enableDevTools: boolean
    mockApi: boolean
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
    enableHotReload: boolean
  }
}

// 默认配置
const defaultConfig: AppConfig = {
  api: {
    tmdb: {
      baseUrl: 'https://api.themoviedb.org/3',
      timeout: 30000,
      retries: 3,
      rateLimit: {
        requests: 40,
        window: 10000
      }
    },
    local: {
      baseUrl: '/api',
      timeout: 15000
    }
  },
  storage: {
    useFileStorage: false,
    autoBackup: true,
    backupInterval: 5 * 60 * 1000, // 5分钟
    maxBackups: 10,
    compressionEnabled: true
  },
  performance: {
    enableMetrics: true,
    metricsInterval: 30000, // 30秒
    memoryCheckInterval: 60000, // 1分钟
    maxLogEntries: 1000,
    enableResourceCleanup: true
  },
  ui: {
    theme: 'system',
    layout: 'original',
    language: 'zh-CN',
    animations: true,
    compactMode: false,
    showDebugInfo: false
  },
  features: {
    enableScheduledTasks: true,
    enableImageProcessing: true,
    enableDataValidation: true,
    enableErrorReporting: true,
    enableAnalytics: false,
    betaFeatures: false
  },
  development: {
    enableDevTools: process.env.NODE_ENV === 'development',
    mockApi: false,
    logLevel: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO',
    enableHotReload: process.env.NODE_ENV === 'development'
  }
}

class ConfigManager {
  private static instance: ConfigManager
  private config: AppConfig
  private listeners: Map<string, ((config: AppConfig) => void)[]> = new Map()

  private constructor() {
    this.config = { ...defaultConfig }
    this.loadConfig()
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      // 从环境变量加载
      this.loadFromEnvironment()
      
      // 从本地存储加载用户配置
      this.loadFromStorage()
      
      log.info('ConfigManager', '配置加载完成', {
        environment: process.env.NODE_ENV,
        features: this.config.features
      })
    } catch (error) {
      const appError = handleError(error, { context: 'loadConfig' })
      log.error('ConfigManager', '配置加载失败', appError)
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): void {
    // API配置
    if (process.env.NEXT_PUBLIC_TMDB_API_BASE_URL) {
      this.config.api.tmdb.baseUrl = process.env.NEXT_PUBLIC_TMDB_API_BASE_URL
    }
    
    if (process.env.NEXT_PUBLIC_API_TIMEOUT) {
      this.config.api.tmdb.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10)
    }

    // 功能开关
    if (process.env.NEXT_PUBLIC_ENABLE_SCHEDULED_TASKS) {
      this.config.features.enableScheduledTasks = process.env.NEXT_PUBLIC_ENABLE_SCHEDULED_TASKS === 'true'
    }

    if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
      this.config.features.enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    }

    if (process.env.NEXT_PUBLIC_BETA_FEATURES) {
      this.config.features.betaFeatures = process.env.NEXT_PUBLIC_BETA_FEATURES === 'true'
    }

    // 开发配置
    if (process.env.NEXT_PUBLIC_LOG_LEVEL) {
      this.config.development.logLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as any
    }

    if (process.env.NEXT_PUBLIC_MOCK_API) {
      this.config.development.mockApi = process.env.NEXT_PUBLIC_MOCK_API === 'true'
    }
  }

  /**
   * 从本地存储加载用户配置
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const savedConfig = localStorage.getItem('app_config')
      if (savedConfig) {
        const userConfig = JSON.parse(savedConfig)
        this.config = this.mergeConfig(this.config, userConfig)
        log.debug('ConfigManager', '用户配置已加载')
      }
    } catch (error) {
      log.warn('ConfigManager', '加载用户配置失败', error)
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      // 只保存用户可修改的配置
      const userConfig = {
        ui: this.config.ui,
        features: {
          enableAnalytics: this.config.features.enableAnalytics,
          betaFeatures: this.config.features.betaFeatures
        },
        performance: {
          enableMetrics: this.config.performance.enableMetrics
        }
      }
      
      localStorage.setItem('app_config', JSON.stringify(userConfig))
      log.debug('ConfigManager', '用户配置已保存')
    } catch (error) {
      log.warn('ConfigManager', '保存用户配置失败', error)
    }
  }

  /**
   * 合并配置
   */
  private mergeConfig(base: AppConfig, override: any): AppConfig {
    const merged = { ...base }
    
    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
          merged[key as keyof AppConfig] = {
            ...merged[key as keyof AppConfig],
            ...override[key]
          } as any
        } else {
          merged[key as keyof AppConfig] = override[key]
        }
      }
    }
    
    return merged
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    return { ...this.config }
  }

  /**
   * 获取配置项
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key]
  }

  /**
   * 获取嵌套配置项
   */
  getPath<T>(path: string): T | undefined {
    const keys = path.split('.')
    let current: any = this.config
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return undefined
      }
    }
    
    return current as T
  }

  /**
   * 更新配置
   */
  update<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value
    this.saveToStorage()
    this.notifyListeners(key)
    
    log.debug('ConfigManager', `配置已更新: ${key}`, value)
  }

  /**
   * 更新嵌套配置
   */
  updatePath(path: string, value: any): void {
    const keys = path.split('.')
    let current: any = this.config
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }
    
    current[keys[keys.length - 1]] = value
    this.saveToStorage()
    this.notifyListeners(keys[0])
    
    log.debug('ConfigManager', `配置已更新: ${path}`, value)
  }

  /**
   * 重置配置
   */
  reset(): void {
    this.config = { ...defaultConfig }
    this.loadFromEnvironment()
    this.saveToStorage()
    
    // 通知所有监听器
    for (const key of Object.keys(this.config)) {
      this.notifyListeners(key)
    }
    
    log.info('ConfigManager', '配置已重置')
  }

  /**
   * 监听配置变化
   */
  subscribe(key: string, callback: (config: AppConfig) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
    
    this.listeners.get(key)!.push(callback)
    
    // 返回取消订阅函数
    return () => {
      const callbacks = this.listeners.get(key)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(key: string): void {
    const callbacks = this.listeners.get(key)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(this.config)
        } catch (error) {
          log.error('ConfigManager', `配置监听器执行失败: ${key}`, error)
        }
      })
    }
  }

  /**
   * 验证配置
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证API配置
    if (this.config.api.tmdb.timeout < 1000) {
      errors.push('TMDB API超时时间不能少于1秒')
    }

    if (this.config.api.tmdb.retries < 0 || this.config.api.tmdb.retries > 10) {
      errors.push('TMDB API重试次数必须在0-10之间')
    }

    // 验证性能配置
    if (this.config.performance.maxLogEntries < 100) {
      errors.push('最大日志条数不能少于100')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 导出配置
   */
  export(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * 导入配置
   */
  import(configJson: string): { success: boolean; errors?: string[] } {
    try {
      const importedConfig = JSON.parse(configJson)
      const validation = this.validate()
      
      if (!validation.valid) {
        return { success: false, errors: validation.errors }
      }

      this.config = this.mergeConfig(defaultConfig, importedConfig)
      this.saveToStorage()
      
      log.info('ConfigManager', '配置导入成功')
      return { success: true }
    } catch (error) {
      const appError = handleError(error, { context: 'importConfig' })
      return { success: false, errors: [appError.userMessage] }
    }
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance()

// React Hook
export function useConfig() {
  const [config, setConfig] = React.useState(configManager.getConfig())

  React.useEffect(() => {
    const unsubscribe = configManager.subscribe('*', (newConfig) => {
      setConfig(newConfig)
    })
    return unsubscribe
  }, [])

  return {
    config,
    get: configManager.get.bind(configManager),
    getPath: configManager.getPath.bind(configManager),
    update: configManager.update.bind(configManager),
    updatePath: configManager.updatePath.bind(configManager),
    reset: configManager.reset.bind(configManager)
  }
}