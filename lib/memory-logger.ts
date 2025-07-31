/**
 * 内存日志管理器
 * 用于在不生成文件的情况下记录操作日志
 */

export interface OperationLog {
  timestamp: string
  operation: string
  details: any
  success: boolean
  error?: string
}

class MemoryLogger {
  private logs: OperationLog[] = []
  private readonly maxLogs: number = 100

  /**
   * 记录操作日志
   */
  log(operation: string, details: any, success: boolean = true, error?: string) {
    const logEntry: OperationLog = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      success,
      error
    }
    
    console.log(`[Docker Version Manager] ${operation}:`, logEntry)
    
    // 存储到内存中，限制数量
    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // 移除最旧的日志
    }
  }

  /**
   * 获取日志
   */
  getLogs(limit?: number): OperationLog[] {
    const logs = limit ? this.logs.slice(-limit) : this.logs
    return [...logs].reverse() // 返回副本，最新的在前
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = []
  }

  /**
   * 获取日志数量
   */
  getCount(): number {
    return this.logs.length
  }
}

// 创建单例实例
const memoryLogger = new MemoryLogger()

export default memoryLogger