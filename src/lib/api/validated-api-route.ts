import { NextRequest, NextResponse } from 'next/server'
import { AuthenticatedAPIRoute } from './authenticated-api-route'
import { z } from 'zod'

export abstract class ValidatedAPIRoute<TRequest = unknown, TQuery = unknown> extends AuthenticatedAPIRoute {
  // Define validation schemas - to be implemented by subclasses
  protected abstract getRequestSchema(): z.ZodSchema<TRequest>
  protected abstract getQuerySchema(): z.ZodSchema<TQuery>

  protected abstract handleValidated(
    request: NextRequest,
    userId: string,
    data: {
      body: TRequest
      query: TQuery
      params?: Record<string, string>
    }
  ): Promise<NextResponse>

  // Override handleAuthenticated to add validation
  protected async handleAuthenticated(
    request: NextRequest,
    userId: string,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> {
    // Parse and validate request body
    const bodyResult = await this.validateRequestBody(request)
    if (!bodyResult.success) {
      return this.validationErrorResponse(bodyResult.error)
    }

    // Parse and validate query parameters
    const queryResult = await this.validateQuery(request)
    if (!queryResult.success) {
      return this.validationErrorResponse(queryResult.error)
    }

    // Execute the validated handler
    return this.handleValidated(request, userId, {
      body: bodyResult.data!,
      query: queryResult.data!,
      params: context?.params
    })
  }

  private async validateRequestBody(request: NextRequest): Promise<{
    success: boolean
    data?: TRequest
    error?: string
  }> {
    try {
      // For GET, DELETE, HEAD requests, body might not be present
      if (['GET', 'DELETE', 'HEAD'].includes(request.method)) {
        const schema = this.getRequestSchema()
        // Allow empty body for these methods if schema allows it
        const emptyResult = schema.safeParse(undefined)
        if (emptyResult.success) {
          return { success: true, data: emptyResult.data as TRequest }
        }
      }

      const rawBody = await request.json()
      const schema = this.getRequestSchema()
      const result = schema.safeParse(rawBody)

      if (result.success) {
        return { success: true, data: result.data as TRequest }
      } else {
        const errorMessages = result.error.errors.map(e =>
          `${e.path.join('.')}: ${e.message}`
        ).join(', ')
        return {
          success: false,
          error: `Validation failed: ${errorMessages}`
        }
      }
    } catch (error) {
      // If body is not required, return success with undefined
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        const schema = this.getRequestSchema()
        const undefinedResult = schema.safeParse(undefined)
        if (undefinedResult.success) {
          return { success: true, data: undefinedResult.data as TRequest }
        }
      }
      return {
        success: false,
        error: 'Invalid request body format'
      }
    }
  }

  private async validateQuery(request: NextRequest): Promise<{
    success: boolean
    data?: TQuery
    error?: string
  }> {
    try {
      const searchParams = new URL(request.url).searchParams
      const queryObject: Record<string, unknown> = {}

      // Convert URLSearchParams to object
      for (const [key, value] of searchParams.entries()) {
        // Try to parse as JSON first, then as number, then keep as string
        try {
          queryObject[key] = JSON.parse(value)
        } catch {
          if (/^\d+$/.test(value)) {
            queryObject[key] = parseInt(value, 10)
          } else if (/^\d*\.\d+$/.test(value)) {
            queryObject[key] = parseFloat(value)
          } else if (value === 'true') {
            queryObject[key] = true
          } else if (value === 'false') {
            queryObject[key] = false
          } else {
            queryObject[key] = value
          }
        }
      }

      const schema = this.getQuerySchema()
      const result = schema.safeParse(queryObject)

      if (result.success) {
        return { success: true, data: result.data as TQuery }
      } else {
        const errorMessages = result.error.errors.map(e =>
          `${e.path.join('.')}: ${e.message}`
        ).join(', ')
        return {
          success: false,
          error: `Query validation failed: ${errorMessages}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid query parameters'
      }
    }
  }

  // Helper method to create common validation schemas
  protected createPaginationSchema() {
    return z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('desc')
    })
  }

  protected createSearchSchema() {
    return z.object({
      q: z.string().optional(),
      search: z.string().optional(),
      filter: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional()
    })
  }

  protected createDateRangeSchema() {
    return z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional()
    })
  }

  protected createIdListSchema() {
    return z.object({
      ids: z.union([
        z.string().transform(val => val.split(',').map(id => id.trim())),
        z.array(z.string())
      ]).optional(),
      id: z.string().optional()
    })
  }

  // Override the base methods to prevent direct calls
  protected getRequestSchema(): z.ZodSchema<TRequest> {
    throw new Error('getRequestSchema must be implemented by subclass')
  }

  protected getQuerySchema(): z.ZodSchema<TQuery> {
    throw new Error('getQuerySchema must be implemented by subclass')
  }
}