/**
 * 统一日志管理系统
 * 支持不同环境的日志级别控制和格式化输出
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private isDevelopment: boolean
  private logs: LogEntry[] = []
  private maxLogs = 1000 // 最大日志条数
  private lastLoggedMap = new Map<string, number>() // 跟踪上次日志时间
  private defaultThrottleMs = 1000 // 默认节流时间（毫秒）

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  private formatMessage(level: LogLevel, category: string, message: string): string {
    const timestamp = new Date().toISOString()
    const levelStr = LogLevel[level]
    return `[${timestamp}] [${levelStr}] [${category}] ${message}`
  }

  private addToHistory(entry: LogEntry): void {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // 移除最旧的日志
    }
  }

  debug(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      category,
      message,
      data
    }
    
    this.addToHistory(entry)
    
    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, category, message), data || '')
    }
  }

  info(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      category,
      message,
      data
    }
    
    this.addToHistory(entry)
    
    if (this.isDevelopment) {
      console.info(this.formatMessage(LogLevel.INFO, category, message), data || '')
    }
  }

  warn(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      category,
      message,
      data
    }
    
    this.addToHistory(entry)
    console.warn(this.formatMessage(LogLevel.WARN, category, message), data || '')
  }

  error(category: string, message: string, error?: Error | any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      category,
      message,
      data: error,
      stack: error instanceof Error ? error.stack : undefined
    }
    
    this.addToHistory(entry)
    console.error(this.formatMessage(LogLevel.ERROR, category, message), error || '')
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level)
    }
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  // 性能监控
  time(category: string, label: string): void {
    if (this.isDevelopment) {
      console.time(`[${category}] ${label}`)
    }
  }

  timeEnd(category: string, label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`[${category}] ${label}`)
    }
  }

  // 节流日志方法，避免重复输出
  throttledDebug(category: string, message: string, throttleMs?: number, data?: any): void {
    const throttle = throttleMs || this.defaultThrottleMs
    const key = `${category}:${message}`
    const now = Date.now()
    const lastLogged = this.lastLoggedMap.get(key) || 0
    
    if (now - lastLogged >= throttle) {
      this.debug(category, message, data)
      this.lastLoggedMap.set(key, now)
    }
  }

  // 检查是否可以输出节流日志（不实际输出）
  shouldLogThrottled(category: string, message: string, throttleMs?: number): boolean {
    const throttle = throttleMs || this.defaultThrottleMs
    const key = `${category}:${message}`
    const now = Date.now()
    const lastLogged = this.lastLoggedMap.get(key) || 0
    
    return now - lastLogged >= throttle
  }
}

// 导出单例实例
export const logger = Logger.getInstance()

// 便捷方法
export const log = {
  debug: (category: string, message: string, data?: any) => logger.debug(category, message, data),
  info: (category: string, message: string, data?: any) => logger.info(category, message, data),
  warn: (category: string, message: string, data?: any) => logger.warn(category, message, data),
  error: (category: string, message: string, error?: any) => logger.error(category, message, error),
  time: (category: string, label: string) => logger.time(category, label),
  timeEnd: (category: string, label: string) => logger.timeEnd(category, label),
  throttledDebug: (category: string, message: string, throttleMs?: number, data?: any) => 
    logger.throttledDebug(category, message, throttleMs, data),
  shouldLogThrottled: (category: string, message: string, throttleMs?: number) => 
    logger.shouldLogThrottled(category, message, throttleMs)
}