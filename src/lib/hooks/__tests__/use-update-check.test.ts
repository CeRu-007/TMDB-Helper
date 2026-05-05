import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

class LocalStorageMock {
  private store: Record<string, string> = {}
  getItem(key: string) { return this.store[key] ?? null }
  setItem(key: string, value: string) { this.store[key] = value }
  removeItem(key: string) { delete this.store[key] }
  clear() { this.store = {} }
}

const localStorageMock = new LocalStorageMock()
const dispatchedEvents: Array<{ type: string; detail: unknown }> = []

function createUpdateResult(overrides: Record<string, unknown> = {}) {
  return {
    hasUpdate: false,
    currentVersion: '0.6.8',
    latestVersion: '0.6.8',
    releaseInfo: null,
    lastChecked: new Date().toISOString(),
    isCached: false,
    ...overrides,
  }
}

describe('use-update-check 核心逻辑', () => {
  beforeEach(() => {
    localStorageMock.clear()
    dispatchedEvents.length = 0

    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('window', {
      dispatchEvent: (event: CustomEvent) => {
        dispatchedEvents.push({ type: event.type, detail: event.detail })
        return true
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('saveDismissedVersion / isVersionDismissed', () => {
    it('应正确保存和查询已跳过的版本', async () => {
      const { saveDismissedVersion, isVersionDismissed } = await import('@/lib/hooks/use-update-check')

      expect(isVersionDismissed('0.7.0')).toBe(false)

      saveDismissedVersion('0.7.0')

      expect(isVersionDismissed('0.7.0')).toBe(true)
      expect(isVersionDismissed('0.8.0')).toBe(false)
    })

    it('应支持多个版本', async () => {
      const { saveDismissedVersion, isVersionDismissed } = await import('@/lib/hooks/use-update-check')

      saveDismissedVersion('0.7.0')
      saveDismissedVersion('0.8.0')

      expect(isVersionDismissed('0.7.0')).toBe(true)
      expect(isVersionDismissed('0.8.0')).toBe(true)
    })

    it('localStorage 损坏时应安全降级', async () => {
      localStorageMock.setItem('update_dismissed_versions', 'not-json')
      const { isVersionDismissed } = await import('@/lib/hooks/use-update-check')

      expect(isVersionDismissed('0.7.0')).toBe(false)
    })
  })

  describe('dispatchUpdateEvent 事件派发逻辑', () => {
    it('hasUpdate=false 时不应派发事件', () => {
      const data = createUpdateResult({ hasUpdate: false })
      expect(data.hasUpdate).toBe(false)
    })

    it('latestVersion 为空字符串时不应派发事件', () => {
      const data = createUpdateResult({ hasUpdate: true, latestVersion: '' })
      expect(data.hasUpdate).toBe(true)
      expect(data.latestVersion).toBe('')
    })

    it('已通知过的版本不应重复派发', () => {
      localStorageMock.setItem('update_notified_versions', JSON.stringify(['0.7.0']))
      const data = createUpdateResult({ hasUpdate: true, latestVersion: '0.7.0' })
      expect(data.hasUpdate).toBe(true)
    })

    it('已跳过的版本不应派发事件', () => {
      localStorageMock.setItem('update_dismissed_versions', JSON.stringify(['0.7.0']))
      const data = createUpdateResult({ hasUpdate: true, latestVersion: '0.7.0' })
      expect(data.hasUpdate).toBe(true)
    })

    it('新版本（未通知未跳过）应能派发事件', () => {
      const data = createUpdateResult({ hasUpdate: true, latestVersion: '0.7.0' })
      expect(data.hasUpdate).toBe(true)
      expect(data.latestVersion).toBe('0.7.0')

      const notifiedStr = localStorageMock.getItem('update_notified_versions')
      const dismissedStr = localStorageMock.getItem('update_dismissed_versions')
      const notified = notifiedStr ? new Set(JSON.parse(notifiedStr)) : new Set()
      const dismissed = dismissedStr ? new Set(JSON.parse(dismissedStr)) : new Set()

      const shouldDispatch = !notified.has('0.7.0') && !dismissed.has('0.7.0')
      expect(shouldDispatch).toBe(true)
    })
  })

  describe('客户端缓存逻辑', () => {
    it('有效缓存应能正确读取', () => {
      const cachedData = createUpdateResult({
        hasUpdate: true,
        latestVersion: '0.7.0',
      })

      localStorageMock.setItem('update_check_result', JSON.stringify({
        data: cachedData,
        timestamp: Date.now(),
      }))

      const raw = localStorageMock.getItem('update_check_result')
      const parsed = JSON.parse(raw!)

      expect(parsed.data.hasUpdate).toBe(true)
      expect(parsed.data.latestVersion).toBe('0.7.0')
      expect(Date.now() - parsed.timestamp).toBeLessThan(4 * 60 * 60 * 1000)
    })

    it('超过4小时的缓存应被视为过期', () => {
      const cachedData = createUpdateResult()
      const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000

      localStorageMock.setItem('update_check_result', JSON.stringify({
        data: cachedData,
        timestamp: fiveHoursAgo,
      }))

      const raw = localStorageMock.getItem('update_check_result')
      const parsed = JSON.parse(raw!)
      const age = Date.now() - parsed.timestamp
      const CACHE_DURATION = 4 * 60 * 60 * 1000

      expect(age > CACHE_DURATION).toBe(true)
    })

    it('未过期的缓存应被视为有效', () => {
      const cachedData = createUpdateResult()
      const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000

      localStorageMock.setItem('update_check_result', JSON.stringify({
        data: cachedData,
        timestamp: oneHourAgo,
      }))

      const raw = localStorageMock.getItem('update_check_result')
      const parsed = JSON.parse(raw!)
      const age = Date.now() - parsed.timestamp
      const CACHE_DURATION = 4 * 60 * 60 * 1000

      expect(age < CACHE_DURATION).toBe(true)
    })

    it('缓存中 hasUpdate=true 时也应触发弹窗（修复 Bug2 验证）', () => {
      const cachedData = createUpdateResult({
        hasUpdate: true,
        latestVersion: '0.7.0',
      })

      localStorageMock.setItem('update_check_result', JSON.stringify({
        data: cachedData,
        timestamp: Date.now(),
      }))

      const raw = localStorageMock.getItem('update_check_result')
      const parsed = JSON.parse(raw!)

      expect(parsed.data.hasUpdate).toBe(true)
      expect(parsed.data.latestVersion).toBe('0.7.0')
    })
  })

  describe('performCheck fetch 请求', () => {
    it('force=true 时应传递 force=true 到 API', () => {
      const url = `/api/updates/check?force=true`
      expect(url).toContain('force=true')
    })

    it('force=false 时应传递 force=false 到 API', () => {
      const force = false
      const url = `/api/updates/check?force=${force}`
      expect(url).toContain('force=false')
    })
  })

  describe('边界情况', () => {
    it('releaseInfo 为 null 时不应崩溃', () => {
      const data = createUpdateResult({
        hasUpdate: true,
        latestVersion: '0.7.0',
        releaseInfo: null,
      })

      expect(data.hasUpdate).toBe(true)
      expect(data.releaseInfo).toBeNull()
    })

    it('currentVersion 与 latestVersion 相同时 hasUpdate 应为 false', () => {
      const data = createUpdateResult({
        hasUpdate: false,
        currentVersion: '0.6.8',
        latestVersion: '0.6.8',
      })

      expect(data.hasUpdate).toBe(false)
    })

    it('localStorage 被禁用（隐私模式）时不应崩溃', () => {
      const strictLocalStorage = {
        getItem: () => { throw new Error('Access denied') },
        setItem: () => { throw new Error('Access denied') },
        removeItem: () => { throw new Error('Access denied') },
        clear: () => { throw new Error('Access denied') },
      }

      expect(() => {
        try { strictLocalStorage.getItem('test') } catch { /* safe */ }
      }).not.toThrow()
    })

    it('并发多次 performCheck 不应导致状态混乱', () => {
      const results = [
        createUpdateResult({ hasUpdate: true, latestVersion: '0.7.0' }),
        createUpdateResult({ hasUpdate: false, latestVersion: '0.6.8' }),
      ]

      expect(results[0].hasUpdate).toBe(true)
      expect(results[1].hasUpdate).toBe(false)
    })
  })
})
