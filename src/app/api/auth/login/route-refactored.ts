import { NextRequest } from 'next/server'
import { z } from 'zod'
import { BaseAPIRoute, APIRateLimiter } from '@/lib/api'
import { AuthManager, LoginRequest } from '@/lib/auth/auth-manager'

// Define validation schema
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false)
})

class LoginRoute extends BaseAPIRoute {
  protected async handle(request: NextRequest): Promise<NextResponse> {
    // Parse and validate request body
    const parseResult = await this.parseRequestBody<z.infer<typeof LoginSchema>>(request)
    if (!parseResult.data) {
      return this.validationErrorResponse(parseResult.error || 'Invalid request body')
    }

    const validation = LoginSchema.safeParse(parseResult.data)
    if (!validation.success) {
      return this.validationErrorResponse(
        validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      )
    }

    const { username, password, rememberMe } = validation.data

    // Check rate limiting before authentication
    const rateLimitResult = APIRateLimiter.checkRateLimit(
      request,
      'login',
      15 * 60 * 1000, // 15 minutes
      5 // 5 attempts
    )

    if (!rateLimitResult.allowed) {
      const lockedMinutes = Math.ceil((rateLimitResult.lockedUntil! - Date.now()) / (60 * 1000))
      return this.rateLimitResponse(
        'Too many login attempts. Please try again later.',
        Math.ceil((rateLimitResult.lockedUntil! - Date.now()) / 1000)
      )
    }

    // Validate credentials
    const user = await AuthManager.validateLogin(username, password)
    if (!user) {
      return this.errorResponse(
        'Invalid username or password',
        401,
        {
          remainingAttempts: rateLimitResult.remaining,
          code: 'INVALID_CREDENTIALS'
        }
      )
    }

    // Reset rate limit on successful login
    APIRateLimiter.resetRateLimit(request, 'login')

    // Generate JWT token
    const token = AuthManager.generateToken(user, rememberMe)

    // Create response
    const response = this.successResponse({
      user: {
        id: user.id,
        username: user.username,
        lastLoginAt: user.lastLoginAt
      },
      message: 'Login successful'
    }, {
      statusCode: 200
    })

    // Set httpOnly cookie
    const sessionDays = user.sessionExpiryDays && user.sessionExpiryDays > 0
      ? user.sessionExpiryDays
      : 15
    const maxAge = (rememberMe ? sessionDays * 2 : sessionDays) * 24 * 60 * 60

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/'
    })

    return response
  }
}

// Export the route handlers
export const POST = (request: NextRequest) => {
  const route = new LoginRoute()
  return route.execute(request)
}

// Handle OPTIONS for CORS
export const OPTIONS = (request: NextRequest) => {
  const route = new LoginRoute()
  return route.execute(request)
}