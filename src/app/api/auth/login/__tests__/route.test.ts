import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/auth-service', () => ({
  AuthService: {
    validateLogin: vi.fn(),
    generateToken: vi.fn(),
  },
}))

vi.mock('@/lib/auth/rate-limiter', () => ({
  RateLimiter: {
    getIdentifier: vi.fn(),
    check: vi.fn(),
    reset: vi.fn(),
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
}))

import { AuthService } from '@/lib/auth/auth-service'
import { RateLimiter } from '@/lib/auth/rate-limiter'
import { POST } from '@/app/api/auth/login/route'

const mockUser = {
  id: 'test-user-id',
  username: 'admin',
  passwordHash: '$2a$12$hash',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: '2024-01-02T00:00:00.000Z',
  sessionExpiryDays: 15,
}

function createLoginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(RateLimiter.getIdentifier).mockReturnValue('admin:unknown')
    vi.mocked(RateLimiter.check).mockReturnValue({
      allowed: true,
      remainingAttempts: 4,
      resetTime: Date.now() + 15 * 60 * 1000,
    })
  })

  describe('正常登录流程', () => {
    it('使用正确凭据登录成功', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.username).toBe('admin')
      expect(data.message).toBe('登录成功')
      expect(AuthService.validateLogin).toHaveBeenCalledWith('admin', 'Password1')
    })

    it('登录成功后重置速率限制', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      await POST(request)

      expect(RateLimiter.reset).toHaveBeenCalledWith('admin:unknown')
    })

    it('登录成功后设置auth-token Cookie', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)

      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('auth-token=jwt-token')
      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('SameSite=lax')
      expect(setCookieHeader).toContain('Path=/')
    })

    it('登录成功返回用户信息不含密码哈希', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.user.id).toBe('test-user-id')
      expect(data.user.username).toBe('admin')
      expect(data.user.passwordHash).toBeUndefined()
    })
  })

  describe('错误密码验证', () => {
    it('错误密码返回401', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)

      const request = createLoginRequest({ username: 'admin', password: 'WrongPass1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })

    it('错误密码返回剩余尝试次数', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)
      vi.mocked(RateLimiter.check).mockReturnValue({
        allowed: true,
        remainingAttempts: 3,
        resetTime: Date.now() + 15 * 60 * 1000,
      })

      const request = createLoginRequest({ username: 'admin', password: 'WrongPass1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.remainingAttempts).toBe(3)
    })

    it('错误密码不重置速率限制', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)

      const request = createLoginRequest({ username: 'admin', password: 'WrongPass1' })
      await POST(request)

      expect(RateLimiter.reset).not.toHaveBeenCalled()
    })

    it('不存在的用户名返回401', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)

      const request = createLoginRequest({ username: 'nonexistent', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('空值输入处理', () => {
    it('空用户名返回401', async () => {
      const request = createLoginRequest({ username: '', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名或密码错误')
    })

    it('空密码返回401', async () => {
      const request = createLoginRequest({ username: 'admin', password: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('仅空格的用户名返回401', async () => {
      const request = createLoginRequest({ username: '   ', password: 'Password1' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('仅空格的密码返回401', async () => {
      const request = createLoginRequest({ username: 'admin', password: '   ' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('缺少username字段返回401', async () => {
      const request = createLoginRequest({ password: 'Password1' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('缺少password字段返回401', async () => {
      const request = createLoginRequest({ username: 'admin' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('空请求体返回401', async () => {
      const request = createLoginRequest({})
      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('账户锁定机制', () => {
    it('超过尝试次数后返回429', async () => {
      vi.mocked(RateLimiter.check).mockReturnValue({
        allowed: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 15 * 60 * 1000,
        lockedUntil: Date.now() + 30 * 60 * 1000,
      })

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toBe('登录尝试次数过多，请稍后再试')
      expect(data.lockedUntil).toBeDefined()
      expect(data.lockedMinutes).toBeGreaterThan(0)
    })

    it('锁定期间不验证登录凭据', async () => {
      vi.mocked(RateLimiter.check).mockReturnValue({
        allowed: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 15 * 60 * 1000,
        lockedUntil: Date.now() + 30 * 60 * 1000,
      })

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      await POST(request)

      expect(AuthService.validateLogin).not.toHaveBeenCalled()
    })

    it('锁定响应包含锁定剩余时间', async () => {
      const lockedUntil = Date.now() + 25 * 60 * 1000
      vi.mocked(RateLimiter.check).mockReturnValue({
        allowed: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 15 * 60 * 1000,
        lockedUntil,
      })

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.lockedUntil).toBe(lockedUntil)
      expect(data.lockedMinutes).toBe(25)
    })

    it('锁定响应中lockedMinutes向上取整', async () => {
      const lockedUntil = Date.now() + 25.5 * 60 * 1000
      vi.mocked(RateLimiter.check).mockReturnValue({
        allowed: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 15 * 60 * 1000,
        lockedUntil,
      })

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.lockedMinutes).toBe(26)
    })
  })

  describe('记住登录状态', () => {
    it('rememberMe=true时生成更长的Token过期时间', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: true })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockUser, true)
    })

    it('rememberMe=false时使用标准过期时间', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: false })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockUser, false)
    })

    it('未指定rememberMe时默认为false', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockUser, false)
    })

    it('rememberMe=true时Cookie maxAge翻倍', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: true })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('Max-Age=2592000')
    })

    it('rememberMe=false时Cookie使用标准maxAge', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: false })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('Max-Age=1296000')
    })
  })

  describe('Cookie安全设置', () => {
    it('Cookie设置HttpOnly', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('HttpOnly')
    })

    it('Cookie设置SameSite=lax', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('SameSite=lax')
    })

    it('Cookie设置Path=/', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('Path=/')
    })
  })

  describe('用户名trim处理', () => {
    it('用户名前后空格被trim', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: '  admin  ', password: 'Password1' })
      await POST(request)

      expect(AuthService.validateLogin).toHaveBeenCalledWith('admin', 'Password1')
    })
  })

  describe('速率限制标识符', () => {
    it('使用用户名和IP生成标识符', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      await POST(request)

      expect(RateLimiter.getIdentifier).toHaveBeenCalledWith('admin', request)
    })
  })

  describe('异常处理', () => {
    it('请求体JSON解析失败时返回错误', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })

    it('AuthService.validateLogin抛出异常时返回500', async () => {
      vi.mocked(AuthService.validateLogin).mockRejectedValue(new Error('DB connection failed'))

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })

    it('AuthService.generateToken抛出异常时返回500', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockImplementation(() => {
        throw new Error('JWT signing failed')
      })

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })
  })

  describe('sessionExpiryDays边界条件', () => {
    it('sessionExpiryDays为0时使用默认值15', async () => {
      const userWithZeroExpiry = { ...mockUser, sessionExpiryDays: 0 }
      vi.mocked(AuthService.validateLogin).mockResolvedValue(userWithZeroExpiry)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('Max-Age=1296000')
    })

    it('sessionExpiryDays为负数时使用默认值15', async () => {
      const userWithNegExpiry = { ...mockUser, sessionExpiryDays: -5 }
      vi.mocked(AuthService.validateLogin).mockResolvedValue(userWithNegExpiry)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('Max-Age=1296000')
    })

    it('自定义sessionExpiryDays生效', async () => {
      const userWithCustomExpiry = { ...mockUser, sessionExpiryDays: 30 }
      vi.mocked(AuthService.validateLogin).mockResolvedValue(userWithCustomExpiry)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('Max-Age=2592000')
    })
  })

  describe('特殊输入场景', () => {
    it('用户名包含SQL注入字符时安全处理', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)

      const request = createLoginRequest({ username: "admin'; DROP TABLE users;--", password: 'Password1' })
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(AuthService.validateLogin).toHaveBeenCalledWith("admin'; DROP TABLE users;--", 'Password1')
    })

    it('密码包含特殊字符时正确传递', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const specialPassword = 'P@$$w0rd!<>"\'&'
      const request = createLoginRequest({ username: 'admin', password: specialPassword })
      await POST(request)

      expect(AuthService.validateLogin).toHaveBeenCalledWith('admin', specialPassword)
    })

    it('超长用户名时安全处理', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)

      const longUsername = 'a'.repeat(1000)
      const request = createLoginRequest({ username: longUsername, password: 'Password1' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('超长密码时安全处理', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(null)

      const longPassword = 'P'.repeat(10000) + '1'
      const request = createLoginRequest({ username: 'admin', password: longPassword })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('rememberMe为truthy非布尔值时转换为true', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: 'yes' })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockUser, true)
    })

    it('rememberMe为falsy非布尔值时转换为false', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: '' })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockUser, false)
    })

    it('rememberMe为0时转换为false', async () => {
      vi.mocked(AuthService.validateLogin).mockResolvedValue(mockUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createLoginRequest({ username: 'admin', password: 'Password1', rememberMe: 0 })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockUser, false)
    })
  })
})
