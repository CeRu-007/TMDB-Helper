import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthMiddleware } from '../auth-middleware'
import type { AuthToken } from '../auth-service'

vi.mock('../auth-service', () => ({
  AuthService: {
    verifyToken: vi.fn(),
    getUser: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      status: init?.status || 200,
      body,
      json: () => Promise.resolve(body),
    })),
  },
  NextRequest: class NextRequest extends Request {},
}))

import { AuthService } from '../auth-service'

const mockToken: AuthToken = {
  userId: 'test-user-id',
  username: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
}

function createMockRequest(cookieValue?: string) {
  return {
    cookies: {
      get: vi.fn().mockReturnValue(cookieValue ? { value: cookieValue } : undefined),
    },
    headers: new Headers(),
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    body: null,
  } as any
}

describe('AuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyRequest', () => {
    it('succeeds with valid token', async () => {
      const request = createMockRequest('valid-token')
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockToken)
      vi.mocked(AuthService.getUser).mockReturnValue({
        id: 'test-user-id',
        username: 'admin',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        sessionExpiryDays: 15,
      })

      const result = await AuthMiddleware.verifyRequest(request)

      expect(result.success).toBe(true)
      expect(result.userId).toBe('test-user-id')
    })

    it('fails with no token', async () => {
      const request = createMockRequest(undefined)

      const result = await AuthMiddleware.verifyRequest(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('未找到认证信息')
    })

    it('fails with invalid token', async () => {
      const request = createMockRequest('invalid-token')
      vi.mocked(AuthService.verifyToken).mockReturnValue(null)

      const result = await AuthMiddleware.verifyRequest(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('认证信息无效')
    })

    it('fails when user does not exist', async () => {
      const request = createMockRequest('valid-token')
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockToken)
      vi.mocked(AuthService.getUser).mockReturnValue(null)

      const result = await AuthMiddleware.verifyRequest(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('用户不存在')
    })
  })

  describe('withAuth', () => {
    it('calls handler on successful auth', async () => {
      const request = createMockRequest('valid-token')
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockToken)
      vi.mocked(AuthService.getUser).mockReturnValue({
        id: 'test-user-id',
        username: 'admin',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        sessionExpiryDays: 15,
      })

      const handler = vi.fn().mockResolvedValue({ status: 200, body: { data: 'ok' } })
      const wrappedHandler = AuthMiddleware.withAuth(handler)

      await wrappedHandler(request)

      expect(handler).toHaveBeenCalled()
      expect(handler.mock.calls[0]?.[0]?.headers?.get('x-user-id')).toBe('test-user-id')
    })

    it('returns 401 on auth failure', async () => {
      const request = createMockRequest(undefined)

      const handler = vi.fn().mockResolvedValue({ status: 200 })
      const wrappedHandler = AuthMiddleware.withAuth(handler)

      const response = await wrappedHandler(request)

      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })
  })

  describe('createAuthErrorResponse', () => {
    it('creates error response with default 401 status', () => {
      const response = AuthMiddleware.createAuthErrorResponse('认证失败')

      expect(response.status).toBe(401)
      expect(response.body).toEqual({ success: false, error: '认证失败' })
    })

    it('creates error response with custom status', () => {
      const response = AuthMiddleware.createAuthErrorResponse('禁止访问', 403)

      expect(response.status).toBe(403)
      expect(response.body).toEqual({ success: false, error: '禁止访问' })
    })
  })
})
