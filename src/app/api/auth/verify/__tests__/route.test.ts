import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/auth-service', () => ({
  AuthService: {
    verifyToken: vi.fn(),
    getUser: vi.fn(),
    getSystemUserId: vi.fn().mockReturnValue('user_admin_system'),
  },
}))

vi.mock('@/lib/database/connection', () => ({
  getDatabaseAsync: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/database/schema', () => ({
  initializeSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/utils/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/utils/error-handler', () => ({
  ErrorHandler: {
    toUserMessage: vi.fn((e: Error) => e.message || '服务器内部错误'),
    getStatusCode: vi.fn(() => 500),
  },
  ApplicationError: class ApplicationError extends Error {
    code: string
    statusCode: number
    constructor(message: string, code: string, statusCode: number) {
      super(message)
      this.code = code
      this.statusCode = statusCode
    }
  },
}))

import { AuthService } from '@/lib/auth/auth-service'
import { GET } from '@/app/api/auth/verify/route'

const mockDecodedToken = {
  userId: 'test-user-id',
  username: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
}

const mockUser = {
  id: 'test-user-id',
  username: 'admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  sessionExpiryDays: 15,
  lastLoginAt: '2024-01-02T00:00:00.000Z',
  loginCount: 1,
  totalUsageTime: 0,
}

function createVerifyRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  const request = new NextRequest('http://localhost:3000/api/auth/verify', {
    method: 'GET',
    headers,
  })
  if (token) {
    request.cookies.set('auth-token', token)
  }
  return request
}

describe('GET /api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Token验证成功', () => {
    it('有效Token返回用户信息', async () => {
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockDecodedToken)
      vi.mocked(AuthService.getUser).mockReturnValue(mockUser)

      const request = createVerifyRequest('valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.username).toBe('admin')
      expect(data.systemUserId).toBe('user_admin_system')
    })

    it('返回的用户信息不含密码哈希', async () => {
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockDecodedToken)
      vi.mocked(AuthService.getUser).mockReturnValue(mockUser)

      const request = createVerifyRequest('valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(data.user.passwordHash).toBeUndefined()
    })
  })

  describe('Token验证失败', () => {
    it('无Token返回401', async () => {
      const request = createVerifyRequest()
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('未找到认证信息')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('无效Token返回401', async () => {
      vi.mocked(AuthService.verifyToken).mockReturnValue(null)

      const request = createVerifyRequest('invalid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('认证信息无效')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('Token有效但用户不存在返回404', async () => {
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockDecodedToken)
      vi.mocked(AuthService.getUser).mockReturnValue(null)

      const request = createVerifyRequest('valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户不存在')
      expect(data.code).toBe('NOT_FOUND')
    })

    it('空字符串Token返回401', async () => {
      const request = createVerifyRequest('')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
    })
  })

  describe('异常处理', () => {
    it('verifyToken抛出异常时返回错误', async () => {
      vi.mocked(AuthService.verifyToken).mockImplementation(() => {
        throw new Error('JWT verification error')
      })

      const request = createVerifyRequest('valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })

    it('getUser抛出异常时返回错误', async () => {
      vi.mocked(AuthService.verifyToken).mockReturnValue(mockDecodedToken)
      vi.mocked(AuthService.getUser).mockImplementation(() => {
        throw new Error('DB error')
      })

      const request = createVerifyRequest('valid-token')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })
  })
})
