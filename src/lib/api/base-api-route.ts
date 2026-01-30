import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, ApiError } from '@/types/api'
import { getUserIdFromRequest } from '@/lib/auth/user-utils'
import { logger } from '@/lib/utils/logger'

export abstract class BaseAPIRoute {
  protected abstract handle(
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse>

  protected async validateRequest(request: NextRequest): Promise<{
    valid: boolean
    error?: string
    statusCode?: number
    userId?: string
  }> {
    try {
      const userId = await getUserIdFromRequest(request)

      if (!userId) {
        return {
          valid: false,
          error: 'Unauthorized - Missing user identity',
          statusCode: 401
        }
      }

      return { valid: true, userId }
    } catch (error) {
      return {
        valid: false,
        error: 'Authentication failed',
        statusCode: 401
      }
    }
  }

  protected successResponse<T>(data: T, options?: {
    message?: string
    headers?: Record<string, string>
    statusCode?: number
  }): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
      ...(options?.message && { message: options.message })
    }

    const nextResponse = NextResponse.json(response, {
      status: options?.statusCode || 200
    })

    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        nextResponse.headers.set(key, value)
      })
    }

    return nextResponse
  }

  protected errorResponse(
    error: string | ApiError,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ): NextResponse {
    const apiError: ApiError = typeof error === 'string'
      ? {
          code: this.getErrorCodeFromStatus(statusCode),
          message: error,
          details,
          timestamp: Date.now()
        }
      : error

    const response: ApiResponse = {
      success: false,
      error: apiError,
      timestamp: Date.now()
    }

    return NextResponse.json(response, { status: statusCode })
  }

  protected validationErrorResponse(message: string, field?: string): NextResponse {
    return this.errorResponse({
      code: 'VALIDATION_ERROR',
      message,
      details: field ? { field } : undefined,
      timestamp: Date.now()
    }, 400)
  }

  protected notFoundResponse(message: string = 'Resource not found'): NextResponse {
    return this.errorResponse({
      code: 'NOT_FOUND',
      message,
      timestamp: Date.now()
    }, 404)
  }

  protected unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
    return this.errorResponse({
      code: 'UNAUTHORIZED',
      message,
      timestamp: Date.now()
    }, 401)
  }

  protected forbiddenResponse(message: string = 'Forbidden'): NextResponse {
    return this.errorResponse({
      code: 'FORBIDDEN',
      message,
      timestamp: Date.now()
    }, 403)
  }

  protected rateLimitResponse(
    message: string = 'Rate limit exceeded',
    retryAfter?: number
  ): NextResponse {
    const response = this.errorResponse({
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      timestamp: Date.now()
    }, 429)

    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString())
    }

    return response
  }

  protected async parseRequestBody<T>(request: NextRequest): Promise<{
    data?: T
    error?: string
  }> {
    try {
      const body = await request.json()
      return { data: body as T }
    } catch (error) {
      return {
        error: 'Invalid JSON in request body'
      }
    }
  }

  protected getSearchParams(request: NextRequest): URLSearchParams {
    return new URL(request.url).searchParams
  }

  protected getPaginationParams(request: NextRequest): {
    page: number
    limit: number
    offset: number
  } {
    const searchParams = this.getSearchParams(request)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    return { page, limit, offset }
  }

  protected setCacheHeaders(
    response: NextResponse,
    maxAge: number = 3600,
    mustRevalidate: boolean = true
  ): NextResponse {
    const cacheControl = mustRevalidate
      ? `public, max-age=${maxAge}, must-revalidate`
      : `public, max-age=${maxAge}`

    response.headers.set('Cache-Control', cacheControl)
    response.headers.set('ETag', this.generateETag())

    return response
  }

  protected setNoCacheHeaders(response: NextResponse): NextResponse {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  }

  protected getCORSHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS || '*'
        : '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  }

  protected handleCORS(response: NextResponse): NextResponse {
    const corsHeaders = this.getCORSHeaders()
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  private getErrorCodeFromStatus(statusCode: number): string {
    const statusToCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE'
    }

    return statusToCodeMap[statusCode] || 'UNKNOWN_ERROR'
  }

  private generateETag(): string {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2)
    return `"${timestamp}-${random}"`
  }

  // Wrapper method to handle all requests with common logic
  public async execute(
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> {
    try {
      // Handle preflight OPTIONS requests for CORS
      if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 200 })
        return this.handleCORS(response)
      }

      // Execute the actual handler
      const response = await this.handle(request, context)

      // Apply CORS headers to all responses
      return this.handleCORS(response)
    } catch (error) {
      logger.error('API Route Error:', error)

      const message = error instanceof Error ? error.message : 'Internal server error'
      const statusCode = this.getStatusCodeFromError(error)

      return this.errorResponse(message, statusCode)
    }
  }

  private getStatusCodeFromError(error: unknown): number {
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
        return 401
      }
      if (error.message.includes('Forbidden') || error.message.includes('Permission')) {
        return 403
      }
      if (error.message.includes('not found') || error.message.includes('Not found')) {
        return 404
      }
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return 400
      }
    }
    return 500
  }
}