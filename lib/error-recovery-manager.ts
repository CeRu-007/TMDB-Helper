/**
 * 错误恢复管理器
 * 处理实时同步系统中的错误恢复和容错机制
 */

import { realtimeSyncManager } from './realtime-sync-manager'

import { performanceMonitor } from './performance-monitor'

interface ErrorContext {
  type: 'connection' | 'sync' | 'optimistic' | 'data' | 'unknown'
  error: Error
  timestamp: number
  retryCount: number
  context?: any
}

interface RecoveryStrategy {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
  maxDelay: number
  shouldRetry: (error: Error, retryCount: number) => boolean
  onRetry?: (error: Error, retryCount: number) => void
  onMaxRetriesReached?: (error: Error) => void
}

class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager
  private errorHistory: ErrorContext[] = []
  private maxHistorySize = 100
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
  private activeRecoveries: Map<string, NodeJS.Timeout> = new Map()

  private constructor() {
    this.initializeDefaultStrategies()
  }

  public static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager()
    }
    return ErrorRecoveryManager.instance
  }

  /**
   * 初始化默认恢复策略
   */
  private initializeDefaultStrategies(): void {
    // 连接错误恢复策略
    this.recoveryStrategies.set('connection', {
      maxRetries: 5,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      shouldRetry: (error, retryCount) => {
        return retryCount < 5 && (
          error.name === 'NetworkError' ||
          error.message.includes('connection') ||
          error.message.includes('timeout')
        )
      },
      onRetry: (error, retryCount) => {
        console.log(`[ErrorRecovery] 连接重试 ${retryCount}/5: ${error.message}`)
      },
      onMaxRetriesReached: (error) => {
        console.error(`[ErrorRecovery] 连接恢复失败，已达到最大重试次数: ${error.message}`)
      }
    })

    // 同步错误恢复策略
    this.recoveryStrategies.set('sync', {
      maxRetries: 3,
      retryDelay: 500,
      backoffMultiplier: 1.5,
      maxDelay: 5000,
      shouldRetry: (error, retryCount) => {
        return retryCount < 3 && !error.message.includes('unauthorized')
      },
      onRetry: (error, retryCount) => {
        console.log(`[ErrorRecovery] 同步重试 ${retryCount}/3: ${error.message}`)
      }
    })

    // 乐观更新错误恢复策略
    this.recoveryStrategies.set('optimistic', {
      maxRetries: 2,
      retryDelay: 200,
      backoffMultiplier: 2,
      maxDelay: 1000,
      shouldRetry: (error, retryCount) => {
        return retryCount < 2 && !error.message.includes('validation')
      },
      onRetry: (error, retryCount) => {
        console.log(`[ErrorRecovery] 乐观更新重试 ${retryCount}/2: ${error.message}`)
      }
    })

    // 数据加载错误恢复策略
    this.recoveryStrategies.set('data', {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000,
      shouldRetry: (error, retryCount) => {
        return retryCount < 3 && (
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('server')
        )
      },
      onRetry: (error, retryCount) => {
        console.log(`[ErrorRecovery] 数据加载重试 ${retryCount}/3: ${error.message}`)
      }
    })
  }

  /**
   * 处理错误并尝试恢复
   */
  public async handleError(
    error: Error,
    type: ErrorContext['type'] = 'unknown',
    context?: any
  ): Promise<boolean> {
    const errorContext: ErrorContext = {
      type,
      error,
      timestamp: Date.now(),
      retryCount: 0,
      context
    }

    // 记录错误
    this.recordError(errorContext)

    // 记录性能事件
    performanceMonitor.startEvent('error')
    performanceMonitor.endEvent('', false, error.message)

    // 尝试恢复
    return this.attemptRecovery(errorContext)
  }

  /**
   * 记录错误
   */
  private recordError(errorContext: ErrorContext): void {
    this.errorHistory.push(errorContext)
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize)
    }

    console.error(`[ErrorRecovery] 记录错误: ${errorContext.type} - ${errorContext.error.message}`)
  }

  /**
   * 尝试恢复
   */
  private async attemptRecovery(errorContext: ErrorContext): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(errorContext.type)
    if (!strategy) {
      console.warn(`[ErrorRecovery] 没有找到 ${errorContext.type} 类型的恢复策略`)
      return false
    }

    const recoveryId = `${errorContext.type}_${errorContext.timestamp}`
    
    // 检查是否应该重试
    if (!strategy.shouldRetry(errorContext.error, errorContext.retryCount)) {
      console.log(`[ErrorRecovery] 不满足重试条件: ${errorContext.type}`)
      return false
    }

    // 计算延迟时间
    const delay = Math.min(
      strategy.retryDelay * Math.pow(strategy.backoffMultiplier, errorContext.retryCount),
      strategy.maxDelay
    )

    console.log(`[ErrorRecovery] 计划在 ${delay}ms 后重试 ${errorContext.type}`)

    // 设置重试定时器
    const retryTimer = setTimeout(async () => {
      this.activeRecoveries.delete(recoveryId)
      
      try {
        errorContext.retryCount++
        
        // 执行重试回调
        if (strategy.onRetry) {
          strategy.onRetry(errorContext.error, errorContext.retryCount)
        }

        // 根据错误类型执行相应的恢复操作
        const success = await this.executeRecovery(errorContext)
        
        if (!success && errorContext.retryCount < strategy.maxRetries) {
          // 继续重试
          await this.attemptRecovery(errorContext)
        } else if (!success) {
          // 达到最大重试次数
          if (strategy.onMaxRetriesReached) {
            strategy.onMaxRetriesReached(errorContext.error)
          }
        }
      } catch (retryError) {
        console.error(`[ErrorRecovery] 重试过程中发生错误:`, retryError)
      }
    }, delay)

    this.activeRecoveries.set(recoveryId, retryTimer)
    return true
  }

  /**
   * 执行具体的恢复操作
   */
  private async executeRecovery(errorContext: ErrorContext): Promise<boolean> {
    try {
      switch (errorContext.type) {
        case 'connection':
          // 重新初始化连接
          await realtimeSyncManager.initialize()
          return realtimeSyncManager.isConnectionActive()

        case 'sync':
          // 重新发送同步请求
          if (errorContext.context?.event) {
            await realtimeSyncManager.notifyDataChange(errorContext.context.event)
            return true
          }
          return false

        case 'optimistic':
          // 乐观更新已移除，直接返回成功
          console.log('[ErrorRecoveryManager] 乐观更新错误恢复已跳过（系统已移除乐观更新）')
          return true

        case 'data':
          // 重新加载数据
          if (errorContext.context?.loadDataFunction) {
            await errorContext.context.loadDataFunction()
            return true
          }
          return false

        default:
          console.warn(`[ErrorRecovery] 未知的恢复类型: ${errorContext.type}`)
          return false
      }
    } catch (recoveryError) {
      console.error(`[ErrorRecovery] 恢复操作失败:`, recoveryError)
      return false
    }
  }

  /**
   * 取消所有活跃的恢复操作
   */
  public cancelAllRecoveries(): void {
    this.activeRecoveries.forEach((timer, id) => {
      clearTimeout(timer)
      console.log(`[ErrorRecovery] 取消恢复操作: ${id}`)
    })
    this.activeRecoveries.clear()
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    recentErrors: ErrorContext[]
    errorRate: number
  } {
    const now = Date.now()
    const oneHourAgo = now - 3600000 // 1小时前
    const recentErrors = this.errorHistory.filter(e => e.timestamp > oneHourAgo)
    
    const errorsByType: Record<string, number> = {}
    recentErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
    })

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recentErrors: recentErrors.slice(-10), // 最近10个错误
      errorRate: recentErrors.length / 60 // 每分钟错误数
    }
  }

  /**
   * 清理旧的错误记录
   */
  public cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 3600000 // 一周前
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > oneWeekAgo)
    console.log(`[ErrorRecovery] 清理完成，保留 ${this.errorHistory.length} 个错误记录`)
  }

  /**
   * 设置自定义恢复策略
   */
  public setRecoveryStrategy(type: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(type, strategy)
    console.log(`[ErrorRecovery] 设置自定义恢复策略: ${type}`)
  }

  /**
   * 导出错误数据
   */
  public exportErrorData(): string {
    return JSON.stringify({
      errorHistory: this.errorHistory.slice(-50), // 最近50个错误
      errorStats: this.getErrorStats(),
      exportTime: new Date().toISOString()
    }, null, 2)
  }
}

export const errorRecoveryManager = ErrorRecoveryManager.getInstance()