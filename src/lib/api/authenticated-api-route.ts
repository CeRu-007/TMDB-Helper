import { NextRequest, NextResponse } from 'next/server'
import { BaseAPIRoute } from './base-api-route'
import { getUserIdFromRequest } from '@/lib/auth/user-utils'

export abstract class AuthenticatedAPIRoute extends BaseAPIRoute {
  protected abstract handleAuthenticated(
    request: NextRequest,
    userId: string,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse>

  // Override the execute method to add authentication
  public async execute(
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> {
    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      return this.handleCORS(response)
    }

    // Validate authentication
    const authResult = await this.validateRequest(request)
    if (!authResult.valid) {
      return this.errorResponse(
        authResult.error || 'Authentication failed',
        authResult.statusCode || 401
      )
    }

    try {
      // Execute the authenticated handler
      const response = await this.handleAuthenticated(
        request,
        authResult.userId!,
        context
      )

      // Apply CORS headers to all responses
      return this.handleCORS(response)
    } catch (error) {
      console.error('Authenticated API Route Error:', error)

      const message = error instanceof Error ? error.message : 'Internal server error'
      const statusCode = this.getStatusCodeFromError(error)

      return this.errorResponse(message, statusCode)
    }
  }

  // Override the base handle method to prevent direct calls
  protected handle(): Promise<NextResponse> {
    throw new Error('Direct handle method called on AuthenticatedAPIRoute. Use handleAuthenticated instead.')
  }

  // Helper method to check user permissions (to be implemented by subclasses)
  protected async checkPermissions(
    userId: string,
    action: string,
    resource?: string
  ): Promise<boolean> {
    // Default implementation - can be overridden
    return true
  }

  // Helper method to check if user has admin role
  protected async isAdmin(userId: string): Promise<boolean> {
    // Implementation depends on your user management system
    // This is a placeholder - implement based on your needs
    return false
  }

  // Helper method to check resource ownership
  protected async ownsResource(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    // Default implementation - should be overridden based on your data model
    return true
  }
}