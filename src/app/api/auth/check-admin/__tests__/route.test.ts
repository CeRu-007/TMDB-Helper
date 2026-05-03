import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/auth-service', () => ({
  AuthService: {
    hasAdmin: vi.fn(),
  },
}))

vi.mock('@/lib/database/connection', () => ({
  getDatabaseAsync: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/database/schema', () => ({
  initializeSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { AuthService } from '@/lib/auth/auth-service'
import { GET as checkAdminGet } from '@/app/api/auth/check-admin/route'

describe('GET /api/auth/check-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('管理员已存在时返回hasAdmin=true', async () => {
    vi.mocked(AuthService.hasAdmin).mockReturnValue(true)

    const request = new NextRequest('http://localhost:3000/api/auth/check-admin')
    const response = await checkAdminGet(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.hasAdmin).toBe(true)
    expect(data.message).toBe('管理员已存在')
  })

  it('管理员不存在时返回hasAdmin=false', async () => {
    vi.mocked(AuthService.hasAdmin).mockReturnValue(false)

    const request = new NextRequest('http://localhost:3000/api/auth/check-admin')
    const response = await checkAdminGet(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.hasAdmin).toBe(false)
    expect(data.message).toBe('尚未注册管理员')
  })

  it('数据库异常时返回500', async () => {
    vi.mocked(AuthService.hasAdmin).mockImplementation(() => {
      throw new Error('DB error')
    })

    const request = new NextRequest('http://localhost:3000/api/auth/check-admin')
    const response = await checkAdminGet(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.hasAdmin).toBe(false)
  })
})
