/**
 * 统一错误处理系统
 * 提供错误分类、用户友好提示和错误恢复机制
 */

import { log } from './logger'

export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API', 
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType
  code?: string
  message: string
  userMessage: string
  originalError?: Error
  context?: Record<string, any>
  timestamp: string
  recoverable: boolean
  retryable: boolean
}

export interface ErrorRecoveryAction {
  label: string
  action: () => void | Promise<void>
}

class ErrorHandler {
  private static instance: ErrorHandler
  private errorHistory: AppError[] = []
  private maxErrorHistory = 100

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * 处理错误并返回标准化的错误对象
   */
  handle(error: Error | any, context?: Record<string, any>): AppError {
    const appError = this.createAppError(error, context)
    this.logError(appError)
    this.addToHistory(appError)
    return appError
  }

  /**
   * 创建标准化错误对象
   */
  private createAppError(error: Error | any, context?: Record<string, any>): AppError {
    const timestamp = new Date().toISOString()
    
    // 网络错误
    if (this.isNetworkError(error)) {
      return {
        type: ErrorType.NETWORK,
        message: error.message || '网络连接失败',
        userMessage: '网络连接异常，请检查网络设置后重试',
        originalError: error,
        context,
        timestamp,
        recoverable: true,
        retryable: true
      }
    }

    // API错误
    if (this.isApiError(error)) {
      const status = error.status || error.response?.status
      return {
        type: ErrorType.API,
        code: status?.toString(),
        message: error.message || 'API请求失败',
        userMessage: this.getApiErrorMessage(status),
        originalError: error,
        context,
        timestamp,
        recoverable: status !== 401 && status !== 403,
        retryable: status >= 500 || status === 429
      }
    }

    // 超时错误
    if (this.isTimeoutError(error)) {
      return {
        type: ErrorType.TIMEOUT,
        message: error.message || '请求超时',
        userMessage: '操作超时，请稍后重试',
        originalError: error,
        context,
        timestamp,
        recoverable: true,
        retryable: true
      }
    }

    // 存储错误
    if (this.isStorageError(error)) {
      return {
        type: ErrorType.STORAGE,
        message: error.message || '存储操作失败',
        userMessage: '数据保存失败，请检查存储空间',
        originalError: error,
        context,
        timestamp,
        recoverable: true,
        retryable: false
      }
    }

    // 权限错误
    if (this.isPermissionError(error)) {
      return {
        type: ErrorType.PERMISSION,
        message: error.message || '权限不足',
        userMessage: '操作权限不足，请检查相关设置',
        originalError: error,
        context,
        timestamp,
        recoverable: false,
        retryable: false
      }
    }

    // 验证错误
    if (this.isValidationError(error)) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message || '数据验证失败',
        userMessage: error.message || '输入数据格式不正确',
        originalError: error,
        context,
        timestamp,
        recoverable: true,
        retryable: false
      }
    }

    // 未知错误
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || '未知错误',
      userMessage: '操作失败，请稍后重试',
      originalError: error,
      context,
      timestamp,
      recoverable: true,
      retryable: true
    }
  }

  /**
   * 错误类型判断方法
   */
  private isNetworkError(error: any): boolean {
    return error instanceof TypeError && 
           (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('Failed to fetch'))
  }

  private isApiError(error: any): boolean {
    return error.response || error.status || error.statusCode
  }

  private isTimeoutError(error: any): boolean {
    return error.name === 'TimeoutError' || 
           error.message?.includes('timeout') ||
           error.code === 'TIMEOUT'
  }

  private isStorageError(error: any): boolean {
    return error.name === 'QuotaExceededError' ||
           error.message?.includes('storage') ||
           error.message?.includes('localStorage') ||
           error.message?.includes('sessionStorage')
  }

  private isPermissionError(error: any): boolean {
    return error.status === 401 || 
           error.status === 403 ||
           error.message?.includes('permission') ||
           error.message?.includes('unauthorized')
  }

  private isValidationError(error: any): boolean {
    return error.name === 'ValidationError' ||
           error.status === 400 ||
           error.message?.includes('validation')
  }

  /**
   * 获取API错误的用户友好消息
   */
  private getApiErrorMessage(status?: number): string {
    switch (status) {
      case 400:
        return '请求参数错误，请检查输入信息'
      case 401:
        return 'API密钥无效，请在设置中重新配置'
      case 403:
        return '访问权限不足'
      case 404:
        return '请求的资源不存在'
      case 429:
        return '请求过于频繁，请稍后再试'
      case 500:
        return '服务器内部错误，请稍后重试'
      case 502:
      case 503:
      case 504:
        return '服务暂时不可用，请稍后重试'
      default:
        return '服务请求失败，请稍后重试'
    }
  }

  /**
   * 记录错误日志
   */
  private logError(appError: AppError): void {
    log.error('ErrorHandler', `${appError.type}: ${appError.message}`, {
      code: appError.code,
      context: appError.context,
      stack: appError.originalError?.stack
    })
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(appError: AppError): void {
    this.errorHistory.push(appError)
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift()
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory]
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * 重试机制
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    backoff: boolean = true
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log.debug('ErrorHandler', `尝试执行操作，第 ${attempt} 次`)
        return await operation()
      } catch (error) {
        lastError = error
        const appError = this.handle(error, { attempt, maxRetries })
        
        if (!appError.retryable || attempt === maxRetries) {
          throw appError
        }
        
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
        log.warn('ErrorHandler', `操作失败，${waitTime}ms后重试`, { attempt, error: appError.message })
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    throw this.handle(lastError)
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance()

// 便捷方法
export const handleError = (error: Error | any, context?: Record<string, any>): AppError => {
  return errorHandler.handle(error, context)
}

export const retryOperation = <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  delay?: number,
  backoff?: boolean
): Promise<T> => {
  return errorHandler.retry(operation, maxRetries, delay, backoff)
}