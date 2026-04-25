import { NextRequest, NextResponse } from 'next/server'
import { BaseAPIRoute } from './base-api-route'
import { AuthMiddleware } from '@/lib/auth/auth-middleware'
import { logger } from '@/lib/utils/logger'

export abstract class AuthenticatedAPIRoute extends BaseAPIRoute {
  protected abstract handleAuthenticated(
    request: NextRequest,
    userId: string,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse>

  protected override async validateRequest(request: NextRequest): Promise<{
    valid: boolean
    error?: string
    statusCode?: number
    userId?: string
  }> {
    const authResult = await AuthMiddleware.verifyRequest(request);
    if (!authResult.success) {
      return {
        valid: false,
        error: authResult.error || '认证失败',
        statusCode: 401
      };
    }
    return { valid: true, userId: authResult.userId! };
  }

  public override async execute(
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> {
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      return this.handleCORS(response)
    }

    const authResult = await this.validateRequest(request)
    if (!authResult.valid) {
      return this.errorResponse(
        authResult.error || 'Authentication failed',
        authResult.statusCode || 401
      )
    }

    try {
      const response = await this.handleAuthenticated(
        request,
        authResult.userId!,
        context
      )

      return this.handleCORS(response)
    } catch (error) {
      logger.error('Authenticated API Route Error:', error)

      const message = error instanceof Error ? error.message : 'Internal server error'
      const statusCode = (error instanceof Error && (
        error.message.includes('Unauthorized') || error.message.includes('Authentication')
      )) ? 401
        : (error instanceof Error && (
          error.message.includes('Forbidden') || error.message.includes('Permission')
        )) ? 403
        : (error instanceof Error && (
          error.message.includes('not found') || error.message.includes('Not found')
        )) ? 404
        : (error instanceof Error && (
          error.message.includes('validation') || error.message.includes('Invalid')
        )) ? 400
        : 500

      return this.errorResponse(message, statusCode)
    }
  }

  protected override handle(): Promise<NextResponse> {
    throw new Error('Direct handle method called on AuthenticatedAPIRoute. Use handleAuthenticated instead.')
  }

  protected async checkPermissions(
    _userId: string,
    _action: string,
    _resource?: string
  ): Promise<boolean> {
    return true
  }

  protected async isAdmin(_userId: string): Promise<boolean> {
    return false
  }

  protected async ownsResource(
    _userId: string,
    _resourceType: string,
    _resourceId: string
  ): Promise<boolean> {
    return true
  }
}
