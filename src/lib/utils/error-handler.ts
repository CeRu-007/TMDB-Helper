import { logger } from '@/lib/utils/logger'

// ============ 错误代码枚举 ============
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// ============ 错误类型枚举（客户端使用） ============
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// ============ AppError 接口（服务端） ============
export interface ServerAppError extends Error {
  code: ErrorCode
  statusCode: number
  details?: any
  isOperational: boolean
}

// ============ AppError 接口（客户端） ============
export interface ClientAppError {
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

// ============ ApplicationError 类 ============
export class ApplicationError extends Error implements ServerAppError {
  code: ErrorCode
  statusCode: number
  details?: any
  isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

// ============ 具体错误类 ============
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details)
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = '未授权访问') {
    super(message, ErrorCode.UNAUTHORIZED, 401, true)
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string = '资源') {
    super(`${resource}未找到`, ErrorCode.NOT_FOUND, 404, true)
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.RESOURCE_CONFLICT, 409, true, details)
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = '请求过于频繁，请稍后再试', details?: any) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, details)
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message?: string) {
    super(
      message || `${service}服务暂时不可用`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      503,
      true,
      { service }
    )
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string = '数据库操作失败', details?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500, false, details)
  }
}

// ============ ErrorHandler 类（服务端） ============
export class ErrorHandler {
  static isAppError(error: any): error is ServerAppError {
    return error instanceof ApplicationError
  }

  static toUserMessage(error: unknown): string {
    if (!(error instanceof Error)) return '操作失败，请稍后重试';

    if (this.isAppError(error)) {
      switch (error.code) {
        case ErrorCode.UNAUTHORIZED:
        case ErrorCode.INVALID_CREDENTIALS:
          return '用户名或密码错误'
        case ErrorCode.TOKEN_EXPIRED:
          return '会话已过期，请重新登录'
        case ErrorCode.TOKEN_INVALID:
          return '无效的会话'
        case ErrorCode.VALIDATION_ERROR:
        case ErrorCode.INVALID_INPUT:
        case ErrorCode.MISSING_REQUIRED_FIELD:
          return error.message || '输入数据无效'
        case ErrorCode.NOT_FOUND:
          return '请求的资源不存在'
        case ErrorCode.ALREADY_EXISTS:
          return '资源已存在'
        case ErrorCode.RATE_LIMIT_EXCEEDED:
          return error.message || '请求过于频繁，请稍后再试'
        case ErrorCode.EXTERNAL_SERVICE_ERROR:
          return `外部服务错误: ${error.details?.service || '未知服务'}`
        case ErrorCode.DATABASE_ERROR:
          return '数据保存失败，请稍后重试'
        default:
          return error.message || '操作失败，请稍后重试'
      }
    }

    if (error.name === 'TypeError') return '数据格式错误'
    if (error.name === 'SyntaxError') return '数据解析错误'
    if (error.name === 'NetworkError') return '网络连接失败'
    return '操作失败，请稍后重试'
  }

  static getStatusCode(error: unknown): number {
    if (!(error instanceof Error)) return 500;

    if (this.isAppError(error)) return error.statusCode
    if (error.name === 'ValidationError') return 400
    if (error.name === 'UnauthorizedError') return 401
    if (error.name === 'NotFoundError') return 404
    if (error.name === 'ConflictError') return 409
    return 500
  }

  static async handleAsync<T>(
    promise: Promise<T>,
    context?: string
  ): Promise<[T | null, Error | null]> {
    try {
      const data = await promise
      return [data, null]
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (context) err.message = `${context}: ${err.message}`
      return [null, err]
    }
  }

  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        if (context) err.message = `${context}: ${err.message}`
        throw err
      }
    }
  }

  static logError(error: Error, context?: string): void {
    const errorMessage = context ? `[${context}] ${error.message}` : error.message
    const errorDetails = {
      message: errorMessage,
      name: error.name,
      stack: error.stack,
      ...(this.isAppError(error) && {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      }),
    }

    if (process.env.NODE_ENV === 'development') {
      logger.error('ErrorHandler', 'Error logged', errorDetails)
    } else {
      logger.error('ErrorHandler', errorMessage)
    }
  }
}

// ============ ClientErrorHandler 类（客户端） ============
class ClientErrorHandler {
  private static instance: ClientErrorHandler
  private errorHistory: ClientAppError[] = []
  private maxErrorHistory = 100

  private constructor() {}

  static getInstance(): ClientErrorHandler {
    if (!ClientErrorHandler.instance) {
      ClientErrorHandler.instance = new ClientErrorHandler()
    }
    return ClientErrorHandler.instance
  }

  /**
   * 处理错误并返回标准化的错误对象
   */
  handle(error: Error | any, context?: Record<string, any>): ClientAppError {
    const appError = this.createAppError(error, context)
    this.logError(appError)
    this.addToHistory(appError)
    return appError
  }

  /**
   * 创建标准化错误对象
   */
  private createAppError(error: Error | any, context?: Record<string, any>): ClientAppError {
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
  private isNetworkError(error: unknown): boolean {
    return error instanceof TypeError &&
           (error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch'))
  }

  private isApiError(error: unknown): boolean {
    return error.response || error.status || error.statusCode
  }

  private isTimeoutError(error: unknown): boolean {
    return error.name === 'TimeoutError' ||
           error.message?.includes('timeout') ||
           error.code === 'TIMEOUT'
  }

  private isStorageError(error: unknown): boolean {
    return error.name === 'QuotaExceededError' ||
           error.message?.includes('storage') ||
           error.message?.includes('localStorage') ||
           error.message?.includes('sessionStorage')
  }

  private isPermissionError(error: unknown): boolean {
    return error.status === 401 ||
           error.status === 403 ||
           error.message?.includes('permission') ||
           error.message?.includes('unauthorized')
  }

  private isValidationError(error: unknown): boolean {
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
  private logError(appError: ClientAppError): void {
    logger.error('ErrorHandler', `${appError.type}: ${appError.message}`, {
      code: appError.code,
      context: appError.context,
      stack: appError.originalError?.stack
    })
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(appError: ClientAppError): void {
    this.errorHistory.push(appError)
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift()
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ClientAppError[] {
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
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('ErrorHandler', `尝试执行操作，第 ${attempt} 次`)
        return await operation()
      } catch (error) {
        lastError = error
        const appError = this.handle(error, { attempt, maxRetries })

        if (!appError.retryable || attempt === maxRetries) {
          throw appError
        }

        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
        logger.warn('ErrorHandler', `操作失败，${waitTime}ms后重试`, { attempt, error: appError.message })

        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    throw this.handle(lastError)
  }
}

// ============ 导出客户端错误处理器实例 ============
const clientErrorHandler = ClientErrorHandler.getInstance()

// ============ 便捷函数（客户端使用） ============
export const handleError = (error: Error | any, context?: Record<string, any>): ClientAppError => {
  return clientErrorHandler.handle(error, context)
}

export const retryOperation = <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  delay?: number,
  backoff?: boolean
): Promise<T> => {
  return clientErrorHandler.retry(operation, maxRetries, delay, backoff)
}

export const getErrorHistory = (): ClientAppError[] => {
  return clientErrorHandler.getErrorHistory()
}

export const clearErrorHistory = (): void => {
  clientErrorHandler.clearErrorHistory()
}

// ============ 全局错误处理函数（服务端使用） ============
export function globalErrorHandler(error: Error, context?: string): never {
  ErrorHandler.logError(error, context)

  if (ErrorHandler.isAppError(error) && error.isOperational) {
    throw error
  }

  throw new ApplicationError(
    process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误',
    ErrorCode.INTERNAL_ERROR,
    500,
    false,
    { originalError: error.name }
  )
}