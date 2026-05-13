import path from 'path'
import type { FileTransport } from './file-transport'

const GLOBAL_TRANSPORT_KEY = '__TMDB_LOG_TRANSPORT__'

function getGlobalTransport(): FileTransport | undefined {
  return (globalThis as any)[GLOBAL_TRANSPORT_KEY]
}

function setGlobalTransport(transport?: FileTransport): void {
  ;(globalThis as any)[GLOBAL_TRANSPORT_KEY] = transport
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export function setFileTransport(transport?: FileTransport): void {
  setGlobalTransport(transport)
}

export function getFileTransport(): FileTransport | undefined {
  return getGlobalTransport()
}

export function getLogDir(): string {
  if (process.env.TMDB_LOG_DIR) return process.env.TMDB_LOG_DIR
  const dataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data')
  return path.join(dataDir, 'logs')
}

export function formatLocalTimestamp(date?: Date): string {
  const d = date ?? new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${y}-${mo}-${dd} ${h}:${mi}:${s}.${ms}`
}

export class Logger {
  private level: LogLevel
  private enableTimestamp: boolean
  private enableColors: boolean
  private prefix: string

  constructor(options: { level?: LogLevel; enableTimestamp?: boolean; enableColors?: boolean; prefix?: string } = {}) {
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
    return formatLocalTimestamp()
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = this.enableTimestamp ? `[${this.formatTimestamp()}]` : ''
    const prefix = this.prefix ? `[${this.prefix}]` : ''
    return `${timestamp}${prefix} [${level}] ${message}`
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private writeToTransport(level: LogLevel, message: string): void {
    const t = getGlobalTransport()
    if (!t) return
    const prefix = this.prefix ? `[${this.prefix}]` : ''
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    const line = `[${formatLocalTimestamp()}]${prefix} [${levelNames[level]}] ${message}`
    t.write(level, line)
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage('DEBUG', message)
      const colored = this.enableColors ? `\x1b[36m${formatted}\x1b[0m` : formatted
      console.debug(colored, ...args)
      this.writeToTransport(LogLevel.DEBUG, args.length > 0 ? `${message} ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}` : message)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage('INFO', message)
      const colored = this.enableColors ? `\x1b[32m${formatted}\x1b[0m` : formatted
      console.info(colored, ...args)
      this.writeToTransport(LogLevel.INFO, args.length > 0 ? `${message} ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}` : message)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage('WARN', message)
      const colored = this.enableColors ? `\x1b[33m${formatted}\x1b[0m` : formatted
      console.warn(colored, ...args)
      this.writeToTransport(LogLevel.WARN, args.length > 0 ? `${message} ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}` : message)
    }
  }

  error(message: string, error?: Error | any, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage('ERROR', message)
      const colored = this.enableColors ? `\x1b[31m${formatted}\x1b[0m` : formatted
      console.error(colored, error || '', ...args)
      const errorMsg = error ? `${message} ${error instanceof Error ? error.message : String(error)}` : message
      this.writeToTransport(LogLevel.ERROR, errorMsg)
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