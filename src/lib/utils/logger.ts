export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LoggerOptions {
  level?: LogLevel
  enableTimestamp?: boolean
  enableColors?: boolean
  prefix?: string
}

export class Logger {
  private level: LogLevel
  private enableTimestamp: boolean
  private enableColors: boolean
  private prefix: string

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? this.getLogLevelFromEnv()
    this.enableTimestamp = options.enableTimestamp ?? true
    this.enableColors = options.enableColors ?? true
    this.prefix = options.prefix ?? ''
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase()
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG
      case 'INFO': return LogLevel.INFO
      case 'WARN': return LogLevel.WARN
      case 'ERROR': return LogLevel.ERROR
      case 'NONE': return LogLevel.NONE
      default: return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = this.enableTimestamp ? `[${this.formatTimestamp()}]` : ''
    const prefix = this.prefix ? `[${this.prefix}]` : ''
    return `${timestamp}${prefix} [${level}] ${message}`
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage('DEBUG', message)
      const colored = this.enableColors ? `\x1b[36m${formatted}\x1b[0m` : formatted
      console.debug(colored, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage('INFO', message)
      const colored = this.enableColors ? `\x1b[32m${formatted}\x1b[0m` : formatted
      console.info(colored, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage('WARN', message)
      const colored = this.enableColors ? `\x1b[33m${formatted}\x1b[0m` : formatted
      console.warn(colored, ...args)
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage('ERROR', message)
      const colored = this.enableColors ? `\x1b[31m${formatted}\x1b[0m` : formatted
      console.error(colored, error || '', ...args)
    }
  }

  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      enableTimestamp: this.enableTimestamp,
      enableColors: this.enableColors,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
    })
  }
}

export const logger = new Logger()
export const apiLogger = logger.child('API')
export const dbLogger = logger.child('DB')
export const authLogger = logger.child('Auth')
export const taskLogger = logger.child('Task')
export const mediaLogger = logger.child('Media')