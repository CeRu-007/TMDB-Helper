import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/utils/error-handler', () => ({
  ErrorHandler: {
    toUserMessage: vi.fn((e: Error) => e.message || '服务器内部错误'),
    getStatusCode: vi.fn(() => 500),
  },
}))

import { POST as logout } from '@/app/api/auth/logout/route'

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('登出成功返回200', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' })
    const response = await logout(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('登出成功')
  })

  it('登出清除auth-token Cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' })
    const response = await logout(request)
    const setCookieHeader = response.headers.get('set-cookie') || ''

    expect(setCookieHeader).toContain('auth-token=')
    expect(setCookieHeader).toContain('Max-Age=0')
  })

  it('登出Cookie保持HttpOnly和安全属性', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' })
    const response = await logout(request)
    const setCookieHeader = response.headers.get('set-cookie') || ''

    expect(setCookieHeader).toContain('HttpOnly')
    expect(setCookieHeader).toContain('SameSite=lax')
    expect(setCookieHeader).toContain('Path=/')
  })

  it('登出不依赖请求体内容', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await logout(request)
    const data = await response.json()

    expect(data.success).toBe(true)
  })

  it('登出时无有效Token也能成功', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' })
    const response = await logout(request)

    expect(response.status).toBe(200)
  })
})
