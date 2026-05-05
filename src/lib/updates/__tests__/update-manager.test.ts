import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

vi.mock('semver', async () => {
  const actual = await vi.importActual('semver')
  return { ...actual }
})

import { UpdateManager } from '@/lib/updates/update-manager'

const mockRelease = {
  tag_name: 'v0.7.0',
  name: 'TMDB Helper v0.7.0',
  body: '## 新功能\n- 测试功能',
  html_url: 'https://github.com/CeRu-007/TMDB-Helper/releases/tag/v0.7.0',
  published_at: '2026-05-01T00:00:00Z',
  prerelease: false,
  draft: false,
}

const mockCacheData = {
  lastChecked: new Date().toISOString(),
  latestVersion: '0.7.0',
  releaseInfo: mockRelease,
}

describe('UpdateManager', () => {
  let manager: UpdateManager

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined)
    manager = new UpdateManager()
  })

  describe('checkForUpdates - GitHub API 调用', () => {
    it('当有新版本时应返回 hasUpdate=true', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(true)
      expect(result.currentVersion).toBe('0.6.8')
      expect(result.latestVersion).toBe('0.7.0')
      expect(result.isCached).toBe(false)
    })

    it('当版本相同时应返回 hasUpdate=false', async () => {
      const sameRelease = { ...mockRelease, tag_name: 'v0.6.8' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(sameRelease),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
    })

    it('当当前版本更高时应返回 hasUpdate=false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      const result = await manager.checkForUpdates('0.8.0')
      expect(result.hasUpdate).toBe(false)
    })

    it('比较版本时只比较 major.minor（忽略 patch）', async () => {
      const release = { ...mockRelease, tag_name: 'v0.7.5' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(release),
      })

      const result = await manager.checkForUpdates('0.6.1')
      expect(result.hasUpdate).toBe(true)
    })

    it('相同 major.minor 不同 patch 应返回 hasUpdate=false', async () => {
      const release = { ...mockRelease, tag_name: 'v0.6.9' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(release),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
    })
  })

  describe('checkForUpdates - prerelease 和 draft 过滤', () => {
    it('prerelease 版本应返回 hasUpdate=false', async () => {
      const prerelease = { ...mockRelease, prerelease: true }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(prerelease),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
      expect(result.latestVersion).toBe('0.6.8')
      expect(result.releaseInfo).toBeNull()
    })

    it('draft 版本应返回 hasUpdate=false', async () => {
      const draft = { ...mockRelease, draft: true }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(draft),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
      expect(result.latestVersion).toBe('0.6.8')
      expect(result.releaseInfo).toBeNull()
    })
  })

  describe('checkForUpdates - GitHub API 错误处理', () => {
    it('404 响应应抛出错误并返回 hasUpdate=false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
    })

    it('403 响应（rate limit）应抛出错误并返回 hasUpdate=false', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
    })

    it('网络错误应返回 hasUpdate=false', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.hasUpdate).toBe(false)
    })
  })

  describe('checkForUpdates - 内存缓存', () => {
    it('非 force 请求应使用内存缓存', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      const first = await manager.checkForUpdates('0.6.8')
      expect(first.hasUpdate).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      const second = await manager.checkForUpdates('0.6.8')
      expect(second.hasUpdate).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('force=true 应跳过内存缓存重新请求', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      await manager.checkForUpdates('0.6.8')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      await manager.checkForUpdates('0.6.8', true)
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('checkForUpdates - 文件缓存（getCachedResult 修复验证）', () => {
    it('文件缓存应正确计算 hasUpdate（而非硬编码 false）', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCacheData))

      const freshManager = new UpdateManager()
      const result = await freshManager.checkForUpdates('0.6.8')

      expect(result.hasUpdate).toBe(true)
      expect(result.latestVersion).toBe('0.7.0')
      expect(result.isCached).toBe(true)
    })

    it('文件缓存中当前版本与最新版本相同时 hasUpdate=false', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCacheData))

      const freshManager = new UpdateManager()
      const result = await freshManager.checkForUpdates('0.7.0')

      expect(result.hasUpdate).toBe(false)
      expect(result.isCached).toBe(true)
    })

    it('文件缓存中当前版本更高时 hasUpdate=false', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCacheData))

      const freshManager = new UpdateManager()
      const result = await freshManager.checkForUpdates('0.8.0')

      expect(result.hasUpdate).toBe(false)
    })

    it('过期的文件缓存应重新请求 API', async () => {
      const expiredCache = {
        ...mockCacheData,
        lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      }
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(expiredCache))

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      const freshManager = new UpdateManager()
      const result = await freshManager.checkForUpdates('0.6.8')

      expect(globalThis.fetch).toHaveBeenCalled()
      expect(result.hasUpdate).toBe(true)
    })

    it('损坏的缓存文件应返回 null 并回退到 API', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      const freshManager = new UpdateManager()
      const result = await freshManager.checkForUpdates('0.6.8')

      expect(globalThis.fetch).toHaveBeenCalled()
      expect(result.hasUpdate).toBe(true)
    })

    it('API 失败时应回退到文件缓存', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCacheData))

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const freshManager = new UpdateManager()
      const result = await freshManager.checkForUpdates('0.6.8')

      expect(result.hasUpdate).toBe(true)
      expect(result.isCached).toBe(true)
    })
  })

  describe('checkForUpdates - 版本号规范化', () => {
    it('tag_name 带 v 前缀应正确处理', async () => {
      const release = { ...mockRelease, tag_name: 'v0.7.0' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(release),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.latestVersion).toBe('0.7.0')
      expect(result.hasUpdate).toBe(true)
    })

    it('tag_name 不带 v 前缀应正确处理', async () => {
      const release = { ...mockRelease, tag_name: '0.7.0' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(release),
      })

      const result = await manager.checkForUpdates('0.6.8')
      expect(result.latestVersion).toBe('0.7.0')
      expect(result.hasUpdate).toBe(true)
    })
  })

  describe('checkForUpdates - GitHub Token', () => {
    it('配置 githubToken 时应在请求头中携带', async () => {
      const tokenManager = new UpdateManager({ githubToken: 'test-token' })
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      await tokenManager.checkForUpdates('0.6.8')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('未配置 githubToken 时不应携带 Authorization 头', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      await manager.checkForUpdates('0.6.8')

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
      const headers = callArgs[1]!.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('saveCache', () => {
    it('成功获取更新后应写入缓存文件', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRelease),
      })

      await manager.checkForUpdates('0.6.8')

      expect(fs.writeFileSync).toHaveBeenCalled()
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
      const writtenData = JSON.parse(writeCall[1] as string)
      expect(writtenData.latestVersion).toBe('0.7.0')
    })
  })
})
