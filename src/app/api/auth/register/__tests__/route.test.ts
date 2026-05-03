import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/auth-service', () => ({
  AuthService: {
    register: vi.fn(),
    getUser: vi.fn(),
    generateToken: vi.fn(),
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
import { POST } from '@/app/api/auth/register/route'

const mockUserInfo = {
  id: 'test-user-id',
  username: 'admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  sessionExpiryDays: 15,
}

const mockFullUser = {
  ...mockUserInfo,
  lastLoginAt: null,
}

function createRegisterRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常注册流程', () => {
    it('首次注册管理员成功', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(mockFullUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createRegisterRequest({ username: 'admin', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.username).toBe('admin')
      expect(data.message).toBe('注册成功')
    })

    it('注册成功后自动登录（设置Cookie）', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(mockFullUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createRegisterRequest({ username: 'admin', password: 'StrongP@ss1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('auth-token=jwt-token')
      expect(setCookieHeader).toContain('HttpOnly')
    })

    it('注册成功后生成Token', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(mockFullUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createRegisterRequest({ username: 'admin', password: 'StrongP@ss1' })
      await POST(request)

      expect(AuthService.generateToken).toHaveBeenCalledWith(mockFullUser, false)
    })

    it('用户名前后空格被trim', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(mockFullUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createRegisterRequest({ username: '  admin  ', password: 'StrongP@ss1' })
      await POST(request)

      expect(AuthService.register).toHaveBeenCalledWith('admin', 'StrongP@ss1')
    })
  })

  describe('重复注册防护', () => {
    it('管理员已存在时注册失败', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: false, error: '管理员账户已存在' })

      const request = createRegisterRequest({ username: 'newadmin', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('管理员账户已存在')
    })

    it('重复注册不设置Cookie', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: false, error: '管理员账户已存在' })

      const request = createRegisterRequest({ username: 'newadmin', password: 'StrongP@ss1' })
      const response = await POST(request)

      expect(AuthService.generateToken).not.toHaveBeenCalled()
    })
  })

  describe('空值输入处理', () => {
    it('空用户名返回400', async () => {
      const request = createRegisterRequest({ username: '', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('用户名和密码不能为空')
    })

    it('空密码返回400', async () => {
      const request = createRegisterRequest({ username: 'admin', password: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('仅空格的用户名返回400', async () => {
      const request = createRegisterRequest({ username: '   ', password: 'StrongP@ss1' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('仅空格的密码返回400', async () => {
      const request = createRegisterRequest({ username: 'admin', password: '   ' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('缺少username字段返回400', async () => {
      const request = createRegisterRequest({ password: 'StrongP@ss1' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('缺少password字段返回400', async () => {
      const request = createRegisterRequest({ username: 'admin' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('输入验证', () => {
    it('用户名太短时注册失败', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: false, error: '用户名长度至少为3个字符' })

      const request = createRegisterRequest({ username: 'ab', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('用户名长度至少为3个字符')
    })

    it('密码太弱时注册失败', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: false, error: '密码长度至少为6位' })

      const request = createRegisterRequest({ username: 'admin', password: '123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('密码长度至少为6位')
    })

    it('用户名包含非法字符时注册失败', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: false, error: '用户名只能包含字母、数字和下划线' })

      const request = createRegisterRequest({ username: 'admin@user', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('用户名只能包含字母、数字和下划线')
    })
  })

  describe('注册后用户信息获取失败', () => {
    it('注册成功但getUser返回null时返回500', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(null)

      const request = createRegisterRequest({ username: 'admin', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('注册成功但无法获取用户信息')
    })
  })

  describe('异常处理', () => {
    it('JSON解析失败时返回错误', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })

    it('AuthService.register抛出异常时返回500', async () => {
      vi.mocked(AuthService.register).mockRejectedValue(new Error('DB error'))

      const request = createRegisterRequest({ username: 'admin', password: 'StrongP@ss1' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })
  })

  describe('Cookie安全设置', () => {
    it('注册Cookie设置HttpOnly', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(mockFullUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const request = createRegisterRequest({ username: 'admin', password: 'StrongP@ss1' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('SameSite=lax')
      expect(setCookieHeader).toContain('Path=/')
    })
  })

  describe('特殊输入场景', () => {
    it('用户名包含SQL注入字符时安全处理', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: false, error: '用户名只能包含字母、数字和下划线' })

      const request = createRegisterRequest({ username: "admin'; DROP TABLE users;--", password: 'StrongP@ss1' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('密码包含XSS字符时安全处理', async () => {
      vi.mocked(AuthService.register).mockResolvedValue({ success: true, user: mockUserInfo })
      vi.mocked(AuthService.getUser).mockReturnValue(mockFullUser)
      vi.mocked(AuthService.generateToken).mockReturnValue('jwt-token')

      const xssPassword = '<script>alert("xss")</script>'
      const request = createRegisterRequest({ username: 'admin', password: xssPassword })
      await POST(request)

      expect(AuthService.register).toHaveBeenCalledWith('admin', xssPassword)
    })
  })
})
