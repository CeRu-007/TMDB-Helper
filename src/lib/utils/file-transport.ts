import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'
import { LogLevel, formatLocalTimestamp } from './logger'

const LOG_BUS_KEY = '__TMDB_LOG_BUS__'

function getLogBus(): EventEmitter {
  if (!(globalThis as any)[LOG_BUS_KEY]) {
    (globalThis as any)[LOG_BUS_KEY] = new EventEmitter()
    ;(globalThis as any)[LOG_BUS_KEY].setMaxListeners(100)
  }
  return (globalThis as any)[LOG_BUS_KEY]
}

export const logBus = {
  on: (event: string, listener: (...args: any[]) => void) => getLogBus().on(event, listener),
  off: (event: string, listener: (...args: any[]) => void) => getLogBus().off(event, listener),
  emit: (event: string, ...args: any[]) => getLogBus().emit(event, ...args),
  removeAllListeners: (event?: string) => getLogBus().removeAllListeners(event),
}

const FILE_SIZE_10MB = 10 * 1024 * 1024
const DEFAULT_MAX_FILES = 5

export interface FileTransportConfig {
  logDir: string
  maxSize?: number
  maxFiles?: number
  level?: LogLevel
  prefix?: string
}

export interface LogFileInfo {
  name: string
  size: number
  lastModified: string
}

export interface ReadLogOptions {
  tail?: number
  offset?: number
  limit?: number
  search?: string
  level?: LogLevel
}

export class FileTransport {
  private logDir: string
  private maxSize: number
  private maxFiles: number
  private level: LogLevel
  private filename: string
  private writeStream: fs.WriteStream | null = null
  private currentSize: number = 0
  private writeQueue: Array<{ line: string; level: LogLevel }> = []
  private flushing = false

  constructor(config: FileTransportConfig) {
    this.logDir = config.logDir
    this.maxSize = config.maxSize ?? FILE_SIZE_10MB
    this.maxFiles = config.maxFiles ?? DEFAULT_MAX_FILES
    this.level = config.level ?? LogLevel.DEBUG
    this.filename = `${config.prefix ?? 'app'}.log`
    this.ensureDir()
    this.currentSize = this.getCurrentFileSize()
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getCurrentFileSize(): number {
    const filePath = path.join(this.logDir, this.filename)
    try {
      const stat = fs.statSync(filePath)
      return stat.size
    } catch {
      return 0
    }
  }

  private rotate(): void {
    this.closeStream()

    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldPath = path.join(this.logDir, `${this.filename}.${i}`)
      const newPath = path.join(this.logDir, `${this.filename}.${i + 1}`)
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath)
      }
    }

    const firstPath = path.join(this.logDir, `${this.filename}.1`)
    const sourcePath = path.join(this.logDir, this.filename)
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, firstPath)
    }

    this.currentSize = 0
  }

  private getStream(): fs.WriteStream {
    if (!this.writeStream) {
      const filePath = path.join(this.logDir, this.filename)
      this.writeStream = fs.createWriteStream(filePath, { flags: 'a' })
      this.writeStream.on('error', () => {})
    }
    return this.writeStream
  }

  private closeStream(): void {
    if (this.writeStream) {
      try {
        this.writeStream.end()
      } catch {}
      this.writeStream = null
    }
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.writeQueue.length === 0) return
    this.flushing = true

    while (this.writeQueue.length > 0) {
      const batch = this.writeQueue.splice(0, 50)
      for (const item of batch) {
        if (item.level < this.level) continue
        try {
          if (this.currentSize >= this.maxSize) {
            this.rotate()
          }
          const stream = this.getStream()
          const buf = Buffer.from(item.line + '\n')
          stream.write(buf)
          this.currentSize += buf.length
        } catch {}
      }
    }

    this.flushing = false
  }

  write(level: LogLevel, message: string): void {
    this.writeQueue.push({ line: message, level })
    logBus.emit('log', { level, message, timestamp: formatLocalTimestamp(), filename: this.filename })
    if (this.writeQueue.length >= 10) {
      this.flush()
    } else {
      setImmediate(() => this.flush())
    }
  }

  async flushSync(): Promise<void> {
    while (this.writeQueue.length > 0) {
      await this.flush()
    }
    if (this.writeStream) {
      this.writeStream.end()
      this.writeStream = null
    }
  }

  getLogFiles(): LogFileInfo[] {
    this.ensureDir()
    const files: LogFileInfo[] = []
    const prefix = this.filename.replace('.log', '')

    try {
      const entries = fs.readdirSync(this.logDir)
      for (const entry of entries) {
        if (entry === this.filename || entry.startsWith(`${prefix}.`)) {
          const filePath = path.join(this.logDir, entry)
          try {
            const stat = fs.statSync(filePath)
            if (stat.isFile()) {
              files.push({
                name: entry,
                size: stat.size,
                lastModified: stat.mtime.toISOString(),
              })
            }
          } catch {}
        }
      }
    } catch {}

    files.sort((a, b) => {
      if (a.name === this.filename) return -1
      if (b.name === this.filename) return 1
      return b.lastModified.localeCompare(a.lastModified)
    })

    return files
  }

  readLogFile(filename: string, options: ReadLogOptions = {}): { content: string; totalLines: number } | null {
    const resolvedPath = path.resolve(this.logDir, filename)
    const normalizedLogDir = path.resolve(this.logDir)

    if (!resolvedPath.startsWith(normalizedLogDir)) {
      return null
    }

    if (!fs.existsSync(resolvedPath)) {
      return null
    }

    try {
      const stat = fs.statSync(resolvedPath)
      if (!stat.isFile()) return null
    } catch {
      return null
    }

    if (options.tail && options.tail > 0) {
      return this.tailFile(resolvedPath, options.tail, options.search, options.level)
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8')
    const lines = content.split('\n').filter(l => l.length > 0)

    let filteredLines = lines

    if (options.search) {
      const lowerSearch = options.search.toLowerCase()
      filteredLines = filteredLines.filter(l => l.toLowerCase().includes(lowerSearch))
    }

    if (options.level !== undefined && options.level > 0) {
      const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
      filteredLines = filteredLines.filter(l => {
        const match = l.match(/\[(DEBUG|INFO|WARN|ERROR)\]/)
        if (!match) return true
        const lineLevel = levelNames.indexOf(match[1]!)
        return lineLevel >= options.level!
      })
    }

    if (options.offset !== undefined || options.limit !== undefined) {
      const start = options.offset ?? 0
      const end = options.limit ? start + options.limit : undefined
      filteredLines = filteredLines.slice(start, end)
    }

    return {
      content: filteredLines.join('\n'),
      totalLines: lines.length,
    }
  }

  private tailFile(filePath: string, lines: number, search?: string, level?: LogLevel): { content: string; totalLines: number } | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const allLines = content.split('\n').filter(l => l.length > 0)
      const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']

      let filtered = allLines

      if (search) {
        const lowerSearch = search.toLowerCase()
        filtered = filtered.filter(l => l.toLowerCase().includes(lowerSearch))
      }

      if (level !== undefined && level > 0) {
        filtered = filtered.filter(l => {
          const match = l.match(/\[(DEBUG|INFO|WARN|ERROR)\]/)
          if (!match) return true
          const lineLevel = levelNames.indexOf(match[1]!)
          return lineLevel >= level!
        })
      }

      const tailed = filtered.slice(-lines)
      return {
        content: tailed.join('\n'),
        totalLines: allLines.length,
      }
    } catch {
      return null
    }
  }

  deleteLogFile(filename?: string): boolean {
    const prefix = this.filename.replace('.log', '')

    if (filename) {
      const resolvedPath = path.resolve(this.logDir, filename)
      const normalizedLogDir = path.resolve(this.logDir)
      if (!resolvedPath.startsWith(normalizedLogDir)) return false

      try {
        fs.unlinkSync(resolvedPath)
        return true
      } catch {
        return false
      }
    }

    this.closeStream()

    try {
      const entries = fs.readdirSync(this.logDir)
      for (const entry of entries) {
        if (entry === this.filename || (entry.startsWith(`${prefix}.`) && entry.endsWith('.log'))) {
          try {
            fs.unlinkSync(path.join(this.logDir, entry))
          } catch {}
        }
      }
      this.currentSize = 0
      return true
    } catch {
      return false
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  destroy(): void {
    this.closeStream()
    this.writeQueue = []
  }
}
