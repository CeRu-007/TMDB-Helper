/**
 * 错误恢复管理器
 * 处理实时同步系统中的错误恢复和容错机制
 */

import { realtimeSyncManager } from '@/lib/data/realtime-sync-manager'

import { performanceMonitor } from './performance-monitor'

interface ErrorContext {
  type: 'connection' | 'sync' | 'optimistic' | 'data' | 'unknown'
  error: Error
  timestamp: number
  retryCount: number
  context?: Record<string, unknown>
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
        
      },
      onMaxRetriesReached: (error) => {
        
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
        
      }
    })
  }

  /**
   * 处理错误并尝试恢复
   */
  public async handleError(
    error: Error,
    type: ErrorContext['type'] = 'unknown',
    context?: Record<string, unknown>
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

  }

  /**
   * 尝试恢复
   */
  private async attemptRecovery(errorContext: ErrorContext): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(errorContext.type)
    if (!strategy) {
      
      return false
    }

    const recoveryId = `${errorContext.type}_${errorContext.timestamp}`
    
    // 检查是否应该重试
    if (!strategy.shouldRetry(errorContext.error, errorContext.retryCount)) {
      
      return false
    }

    // 计算延迟时间
    const delay = Math.min(
      strategy.retryDelay * Math.pow(strategy.backoffMultiplier, errorContext.retryCount),
      strategy.maxDelay
    )

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
          if (errorContext.context?.event && typeof errorContext.context.event === 'object') {
            await realtimeSyncManager.notifyDataChange(errorContext.context.event)
            return true
          }
          return false

        case 'optimistic':
          // 乐观更新已移除，直接返回成功
          
          return true

        case 'data':
          // 重新加载数据
          if (errorContext.context?.loadDataFunction) {
            await errorContext.context.loadDataFunction()
            return true
          }
          return false

        default:
          
          return false
      }
    } catch (recoveryError) {
      
      return false
    }
  }

  /**
   * 取消所有活跃的恢复操作
   */
  public cancelAllRecoveries(): void {
    this.activeRecoveries.forEach((timer, id) => {
      clearTimeout(timer)
      
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
    
  }

  /**
   * 设置自定义恢复策略
   */
  public setRecoveryStrategy(type: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(type, strategy)
    
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