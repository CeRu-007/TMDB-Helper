import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { AuthService } from '@/lib/auth/auth-service'
import { GET as initGet } from '@/app/api/auth/init/route'

describe('GET /api/auth/init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('管理员已存在时返回initialized=true', async () => {
    vi.mocked(AuthService.hasAdmin).mockReturnValue(true)

    const response = await initGet()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.initialized).toBe(true)
    expect(data.message).toBe('系统已初始化')
  })

  it('管理员不存在时返回initialized=false', async () => {
    vi.mocked(AuthService.hasAdmin).mockReturnValue(false)

    const response = await initGet()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.initialized).toBe(false)
    expect(data.message).toBe('系统未初始化，等待管理员注册')
  })

  it('数据库异常时返回503', async () => {
    vi.mocked(AuthService.hasAdmin).mockImplementation(() => {
      throw new Error('DB connection failed')
    })

    const response = await initGet()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.success).toBe(false)
    expect(data.initialized).toBe(false)
  })
})
