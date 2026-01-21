import { NextRequest } from 'next/server'
import { z } from 'zod'
import { RateLimiter } from '@/lib/auth/rate-limiter'

// Rate limiting utilities
export class APIRateLimiter {
  private static instances = new Map<string, RateLimiter>()

  static getInstance(identifier: string, windowMs?: number, max?: number): RateLimiter {
    const key = `${identifier}-${windowMs || 900000}-${max || 100}` // 15 mins, 100 requests default

    if (!this.instances.has(key)) {
      this.instances.set(key, new RateLimiter(windowMs, max))
    }

    return this.instances.get(key)!
  }

  static checkRateLimit(
    request: NextRequest,
    endpoint: string,
    windowMs?: number,
    max?: number
  ): { allowed: boolean; lockedUntil?: number; remaining: number } {
    const identifier = this.getIdentifier(request, endpoint)
    const limiter = this.getInstance(identifier, windowMs, max)
    return limiter.check(identifier)
  }

  static resetRateLimit(request: NextRequest, endpoint: string): void {
    const identifier = this.getIdentifier(request, endpoint)
    const limiter = this.getInstance(identifier)
    limiter.reset(identifier)
  }

  private static getIdentifier(request: NextRequest, endpoint: string): string {
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    return `${endpoint}:${ip}:${this.hashUserAgent(userAgent)}`
  }

  private static getClientIP(request: NextRequest): string {
    // Try various headers for the real IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
    const xClientIP = request.headers.get('x-client-ip')

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }
    if (realIP) {
      return realIP
    }
    if (cfConnectingIP) {
      return cfConnectingIP
    }
    if (xClientIP) {
      return xClientIP
    }

    // Fallback to request IP
    return request.ip || '127.0.0.1'
  }

  private static hashUserAgent(userAgent: string): string {
    let hash = 0
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

// Request validation utilities
export class RequestValidator {
  static validateContentType(request: NextRequest, allowedTypes: string[]): boolean {
    const contentType = request.headers.get('content-type')
    if (!contentType) return allowedTypes.length === 0

    return allowedTypes.some(type => contentType.includes(type))
  }

  static validateContentLength(request: NextRequest, maxLength: number): boolean {
    const contentLength = request.headers.get('content-length')
    if (!contentLength) return true

    return parseInt(contentLength, 10) <= maxLength
  }

  static validateJSONBody(request: NextRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const clone = request.clone()
      clone.text()
        .then(text => {
          try {
            JSON.parse(text)
            resolve(true)
          } catch {
            resolve(false)
          }
        })
        .catch(() => resolve(false))
    })
  }
}

// Response utilities
export class ResponseHelper {
  static createFileStream(
    stream: ReadableStream,
    contentType: string,
    filename?: string
  ): Response {
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    })

    if (filename) {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    }

    return new Response(stream, { headers })
  }

  static createImageResponse(
    buffer: ArrayBuffer | Uint8Array,
    contentType: string,
    maxAge: number = 86400 // 1 day default
  ): Response {
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${maxAge}, immutable`,
      'ETag': this.generateETag(buffer)
    })

    return new Response(buffer, { headers })
  }

  private static generateETag(data: ArrayBuffer | Uint8Array): string {
    // Simple hash function for ETag generation
    const hash = this.simpleHash(data)
    return `"${hash}"`
  }

  private static simpleHash(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    let hash = 0
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) & 0xffffffff
    }
    return Math.abs(hash).toString(36)
  }
}

// Schema validation helpers
export const CommonSchemas = {
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional()
  }),

  sort: z.object({
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),

  search: z.object({
    q: z.string().optional(),
    query: z.string().optional(),
    search: z.string().optional()
  }),

  id: z.object({
    id: z.string().min(1)
  }),

  ids: z.object({
    ids: z.union([
      z.string().transform(val => val.split(',').map(id => id.trim()).filter(Boolean)),
      z.array(z.string().min(1))
    ]).optional()
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }),

  boolean: z.object({
    flag: z.union([
      z.string().transform(val => val === 'true'),
      z.boolean()
    ]).optional()
  })
}

// Error handling utilities
export class APIErrorHandler {
  private static readonly ERROR_MESSAGES = {
    VALIDATION_ERROR: 'Invalid request data',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Resource conflict',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    BAD_GATEWAY: 'Service temporarily unavailable',
    SERVICE_UNAVAILABLE: 'Service unavailable'
  }

  static getErrorMessage(code: string): string {
    return this.ERROR_MESSAGES[code as keyof typeof this.ERROR_MESSAGES] || 'Unknown error occurred'
  }

  static logError(error: unknown, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      timestamp,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context
    }

    console.error('[API Error]', JSON.stringify(errorInfo, null, 2))
  }

  static isClientError(statusCode: number): boolean {
    return statusCode >= 400 && statusCode < 500
  }

  static isServerError(statusCode: number): boolean {
    return statusCode >= 500
  }
}

// Cache utilities
export class APICache {
  private static cache = new Map<string, {
    data: unknown
    timestamp: number
    ttl: number
  }>()

  static set(key: string, data: unknown, ttl: number = 300000): void { // 5 mins default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  static delete(key: string): boolean {
    return this.cache.delete(key)
  }

  static clear(): void {
    this.cache.clear()
  }

  static cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => APICache.cleanup(), 300000)
}