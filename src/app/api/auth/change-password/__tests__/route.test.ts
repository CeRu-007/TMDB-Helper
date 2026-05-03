import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/auth-service', () => ({
  AuthService: {
    changePassword: vi.fn(),
  },
}))

vi.mock('@/lib/auth/auth-middleware', () => ({
  AuthMiddleware: {
    withAuth: (handler: Function) => handler,
  },
}))

vi.mock('@/lib/auth/password-validator', () => ({
  validatePassword: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/utils/error-handler', () => ({
  ErrorHandler: {
    toUserMessage: vi.fn((e: Error) => e.message || '服务器内部错误'),
    getStatusCode: vi.fn(() => 500),
  },
}))

import { AuthService } from '@/lib/auth/auth-service'
import { validatePassword } from '@/lib/auth/password-validator'
import { POST } from '@/app/api/auth/change-password/route'

function createChangePasswordRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常修改密码流程', () => {
    it('使用正确当前密码修改成功', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: true,
        strength: 'strong',
        checks: { minLength: true, hasUppercase: true, hasLowercase: true, hasNumber: true, hasSpecial: true },
      })
      vi.mocked(AuthService.changePassword).mockResolvedValue(true)

      const request = createChangePasswordRequest({ currentPassword: 'OldPass1', newPassword: 'NewPass1!' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('密码修改成功，请重新登录')
    })

    it('修改成功后清除Cookie要求重新登录', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: true,
        strength: 'strong',
        checks: { minLength: true, hasUppercase: true, hasLowercase: true, hasNumber: true, hasSpecial: true },
      })
      vi.mocked(AuthService.changePassword).mockResolvedValue(true)

      const request = createChangePasswordRequest({ currentPassword: 'OldPass1', newPassword: 'NewPass1!' })
      const response = await POST(request)
      const setCookieHeader = response.headers.get('set-cookie') || ''

      expect(setCookieHeader).toContain('auth-token=')
      expect(setCookieHeader).toContain('Max-Age=0')
    })
  })

  describe('当前密码错误', () => {
    it('当前密码错误返回400', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: true,
        strength: 'strong',
        checks: { minLength: true, hasUppercase: true, hasLowercase: true, hasNumber: true, hasSpecial: true },
      })
      vi.mocked(AuthService.changePassword).mockResolvedValue(false)

      const request = createChangePasswordRequest({ currentPassword: 'WrongPass1', newPassword: 'NewPass1!' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('当前密码错误')
    })
  })

  describe('空值输入处理', () => {
    it('缺少currentPassword返回400', async () => {
      const request = createChangePasswordRequest({ newPassword: 'NewPass1!' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('当前密码和新密码不能为空')
    })

    it('缺少newPassword返回400', async () => {
      const request = createChangePasswordRequest({ currentPassword: 'OldPass1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('当前密码和新密码不能为空')
    })

    it('两个字段都缺少返回400', async () => {
      const request = createChangePasswordRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('currentPassword为空字符串返回400', async () => {
      const request = createChangePasswordRequest({ currentPassword: '', newPassword: 'NewPass1!' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('newPassword为空字符串返回400', async () => {
      const request = createChangePasswordRequest({ currentPassword: 'OldPass1', newPassword: '' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('新密码强度验证', () => {
    it('新密码太短返回400', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: false,
        error: '密码长度至少为6位',
        strength: 'weak',
        checks: { minLength: false, hasUppercase: false, hasLowercase: true, hasNumber: false, hasSpecial: false },
      })

      const request = createChangePasswordRequest({ currentPassword: 'OldPass1', newPassword: '123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('密码长度至少为6位')
    })

    it('新密码不满足强度要求时不调用changePassword', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: false,
        error: '密码长度至少为6位',
        strength: 'weak',
        checks: { minLength: false, hasUppercase: false, hasLowercase: true, hasNumber: false, hasSpecial: false },
      })

      const request = createChangePasswordRequest({ currentPassword: 'OldPass1', newPassword: '123' })
      await POST(request)

      expect(AuthService.changePassword).not.toHaveBeenCalled()
    })
  })

  describe('新密码与当前密码相同', () => {
    it('新旧密码相同时仍允许修改（由AuthService决定）', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: true,
        strength: 'strong',
        checks: { minLength: true, hasUppercase: true, hasLowercase: true, hasNumber: true, hasSpecial: true },
      })
      vi.mocked(AuthService.changePassword).mockResolvedValue(true)

      const request = createChangePasswordRequest({ currentPassword: 'SamePass1', newPassword: 'SamePass1' })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('异常处理', () => {
    it('JSON解析失败时返回错误', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })

    it('AuthService.changePassword抛出异常时返回500', async () => {
      vi.mocked(validatePassword).mockReturnValue({
        valid: true,
        strength: 'strong',
        checks: { minLength: true, hasUppercase: true, hasLowercase: true, hasNumber: true, hasSpecial: true },
      })
      vi.mocked(AuthService.changePassword).mockRejectedValue(new Error('DB error'))

      const request = createChangePasswordRequest({ currentPassword: 'OldPass1', newPassword: 'NewPass1!' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
    })
  })
})
