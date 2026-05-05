import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/updates/update-manager', () => ({
  getUpdateManager: vi.fn(),
}))

vi.mock('../../../../../package.json', () => ({
  default: { version: '0.6.8' },
}))

import { GET } from '@/app/api/updates/check/route'
import { getUpdateManager } from '@/lib/updates/update-manager'

const mockUpdateManager = {
  checkForUpdates: vi.fn(),
}

describe('/api/updates/check API 路由', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUpdateManager).mockReturnValue(mockUpdateManager as any)
  })

  function createRequest(url: string) {
    return new NextRequest(new URL(url, 'http://localhost'))
  }

  describe('正常请求', () => {
    it('有更新时应返回正确数据', async () => {
      mockUpdateManager.checkForUpdates.mockResolvedValue({
        hasUpdate: true,
        currentVersion: '0.6.8',
        latestVersion: '0.7.0',
        releaseInfo: { tag_name: 'v0.7.0', name: 'v0.7.0' },
        lastChecked: new Date().toISOString(),
        isCached: false,
      })

      const request = createRequest('/api/updates/check')
      const response = await GET(request)
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.hasUpdate).toBe(true)
      expect(result.data.currentVersion).toBe('0.6.8')
      expect(result.data.latestVersion).toBe('0.7.0')
    })

    it('无更新时应返回 hasUpdate=false', async () => {
      mockUpdateManager.checkForUpdates.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '0.6.8',
        latestVersion: '0.6.8',
        releaseInfo: null,
        lastChecked: new Date().toISOString(),
        isCached: false,
      })

      const request = createRequest('/api/updates/check')
      const response = await GET(request)
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.hasUpdate).toBe(false)
    })

    it('force=true 时应传递给 UpdateManager', async () => {
      mockUpdateManager.checkForUpdates.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '0.6.8',
        latestVersion: '0.6.8',
        releaseInfo: null,
        lastChecked: new Date().toISOString(),
        isCached: false,
      })

      const request = createRequest('/api/updates/check?force=true')
      const response = await GET(request)
      const result = await response.json()

      expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith('0.6.8', true)
      expect(result.success).toBe(true)
    })

    it('force 未指定时默认为 false', async () => {
      mockUpdateManager.checkForUpdates.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '0.6.8',
        latestVersion: '0.6.8',
        releaseInfo: null,
        lastChecked: new Date().toISOString(),
        isCached: false,
      })

      const request = createRequest('/api/updates/check')
      await GET(request)

      expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith('0.6.8', false)
    })
  })

  describe('错误处理', () => {
    it('UpdateManager 抛出错误时应尝试回退到缓存', async () => {
      mockUpdateManager.checkForUpdates
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          hasUpdate: true,
          currentVersion: '0.6.8',
          latestVersion: '0.7.0',
          releaseInfo: null,
          lastChecked: new Date().toISOString(),
          isCached: true,
        })

      const request = createRequest('/api/updates/check')
      const response = await GET(request)
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.data.isCached).toBe(true)
      expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledTimes(2)
    })

    it('UpdateManager 两次都失败时应返回 500', async () => {
      mockUpdateManager.checkForUpdates
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('Cache error'))

      const request = createRequest('/api/updates/check')
      const response = await GET(request)
      const result = await response.json()

      expect(result.success).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('版本号传递', () => {
    it('应使用 package.json 中的版本号作为 currentVersion', async () => {
      mockUpdateManager.checkForUpdates.mockResolvedValue({
        hasUpdate: false,
        currentVersion: '0.6.8',
        latestVersion: '0.6.8',
        releaseInfo: null,
        lastChecked: new Date().toISOString(),
        isCached: false,
      })

      const request = createRequest('/api/updates/check')
      await GET(request)

      expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith(
        expect.stringContaining('0.6.8'),
        expect.any(Boolean)
      )
    })
  })
})
