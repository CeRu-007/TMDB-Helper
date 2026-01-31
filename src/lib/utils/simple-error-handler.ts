/**
 * Simplified error handling utilities
 */

export interface AppError {
  message: string
  userMessage: string
  type: 'NETWORK' | 'API' | 'VALIDATION' | 'UNKNOWN'
  code?: string | number
  originalError?: unknown
}

/**
 * Create a standardized error object
 */
export function createError(
  error: unknown,
  context: Record<string, any> = {}
): AppError {
  // If it's already an AppError, return it
  if (error && typeof error === 'object' && 'userMessage' in error) {
    return error as AppError
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Determine error type
    let type: AppError['type'] = 'UNKNOWN'
    let code: string | number | undefined

    if (message.includes('fetch') || message.includes('network')) {
      type = 'NETWORK'
    } else if (message.includes('api') || message.includes('401') || message.includes('400')) {
      type = 'API'
      const match = message.match(/\((\d{3})\)/)
      if (match) code = parseInt(match[1])
    } else if (message.includes('validation') || message.includes('invalid')) {
      type = 'VALIDATION'
    }

    return {
      message: error.message,
      userMessage: getFriendlyErrorMessage(error.message, type),
      type,
      code,
      originalError: error
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      userMessage: getFriendlyErrorMessage(error),
      type: 'UNKNOWN',
      originalError: error
    }
  }

  // Unknown error type
  return {
    message: 'Unknown error occurred',
    userMessage: '操作失败，请重试',
    type: 'UNKNOWN',
    originalError: error
  }
}

/**
 * Convert technical error messages to user-friendly messages
 */
function getFriendlyErrorMessage(message: string, type?: AppError['type']): string {
  const lowerMessage = message.toLowerCase()

  // API key errors
  if (lowerMessage.includes('api密钥未配置') || lowerMessage.includes('api key')) {
    return '请先配置TMDB API密钥'
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return '网络连接失败，请检查网络后重试'
  }

  // Authentication errors
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    return '身份验证失败，请刷新页面重试'
  }

  // Rate limit errors
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
    return '请求过于频繁，请稍后再试'
  }

  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('server error')) {
    return '服务器错误，请稍后重试'
  }

  // Default message
  return '操作失败，请重试'
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  exponential: boolean = true
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry on client errors (4xx)
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        if (message.includes('(400') || message.includes('(401') || message.includes('(403') || message.includes('(404)')) {
          throw error
        }
      }

      // If this is the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw error
      }

      // Calculate delay
      const delay = exponential ? baseDelay * Math.pow(2, attempt - 1) : baseDelay
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Handle errors consistently throughout the app
 */
export function handleError(error: unknown, context: Record<string, any> = {}): AppError {
  const appError = createError(error, context)

  // Log error for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', appError)
  }

  return appError
}