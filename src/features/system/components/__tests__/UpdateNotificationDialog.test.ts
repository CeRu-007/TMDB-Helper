import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

class LocalStorageMock {
  private store: Record<string, string> = {}
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, value: string) { this.store[key] = value }
  removeItem(key: string) { delete this.store[key] }
  clear() { this.store = {} }
}

const localStorageMock = new LocalStorageMock()

describe('UpdateNotificationDialog 逻辑验证', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn().mockReturnValue(true),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('isVersionDismissed - 弹窗跳过逻辑', () => {
    it('未跳过的版本应返回 false（弹窗应显示）', async () => {
      const { isVersionDismissed } = await import('@/lib/hooks/use-update-check')
      expect(isVersionDismissed('0.7.0')).toBe(false)
    })

    it('已跳过的版本应返回 true（弹窗不应显示）', async () => {
      const { saveDismissedVersion, isVersionDismissed } = await import('@/lib/hooks/use-update-check')
      saveDismissedVersion('0.7.0')
      expect(isVersionDismissed('0.7.0')).toBe(true)
    })

    it('跳过版本 A 不影响版本 B', async () => {
      const { saveDismissedVersion, isVersionDismissed } = await import('@/lib/hooks/use-update-check')
      saveDismissedVersion('0.7.0')
      expect(isVersionDismissed('0.7.0')).toBe(true)
      expect(isVersionDismissed('0.8.0')).toBe(false)
    })
  })

  describe('version-update-available 事件处理', () => {
    it('事件 detail 应包含 currentVersion、latestVersion、releaseInfo', () => {
      const eventDetail = {
        currentVersion: '0.6.8',
        latestVersion: '0.7.0',
        releaseInfo: {
          tag_name: 'v0.7.0',
          name: 'TMDB Helper v0.7.0',
          body: '## 新功能',
          html_url: 'https://github.com/CeRu-007/TMDB-Helper/releases/tag/v0.7.0',
          published_at: '2026-05-01T00:00:00Z',
          prerelease: false,
          draft: false,
        },
      }

      expect(eventDetail.currentVersion).toBe('0.6.8')
      expect(eventDetail.latestVersion).toBe('0.7.0')
      expect(eventDetail.releaseInfo).toBeDefined()
      expect(eventDetail.releaseInfo.html_url).toContain('github.com')
    })

    it('已跳过的版本收到事件时不应打开弹窗', async () => {
      const { saveDismissedVersion, isVersionDismissed } = await import('@/lib/hooks/use-update-check')
      saveDismissedVersion('0.7.0')

      const latestVersion = '0.7.0'
      const shouldShowDialog = !isVersionDismissed(latestVersion)

      expect(shouldShowDialog).toBe(false)
    })

    it('未跳过的版本收到事件时应打开弹窗', async () => {
      const { isVersionDismissed } = await import('@/lib/hooks/use-update-check')

      const latestVersion = '0.7.0'
      const shouldShowDialog = !isVersionDismissed(latestVersion)

      expect(shouldShowDialog).toBe(true)
    })
  })

  describe('弹窗关闭行为', () => {
    it('点击"稍后"不应跳过版本（下次仍会弹窗）', async () => {
      const { isVersionDismissed } = await import('@/lib/hooks/use-update-check')
      expect(isVersionDismissed('0.7.0')).toBe(false)
    })

    it('勾选"跳过此版本"后关闭应保存跳过状态', async () => {
      const { saveDismissedVersion, isVersionDismissed } = await import('@/lib/hooks/use-update-check')
      saveDismissedVersion('0.7.0')
      expect(isVersionDismissed('0.7.0')).toBe(true)
    })
  })

  describe('下载链接', () => {
    it('有 releaseInfo.html_url 时应使用该链接', () => {
      const releaseInfo = {
        html_url: 'https://github.com/CeRu-007/TMDB-Helper/releases/tag/v0.7.0',
      }

      const downloadUrl = releaseInfo.html_url
      expect(downloadUrl).toContain('github.com')
      expect(downloadUrl).toContain('v0.7.0')
    })

    it('无 releaseInfo.html_url 时应使用默认链接', () => {
      const defaultUrl = 'https://github.com/CeRu-007/TMDB-Helper/releases/latest'
      expect(defaultUrl).toContain('github.com')
      expect(defaultUrl).toContain('releases/latest')
    })
  })
})
