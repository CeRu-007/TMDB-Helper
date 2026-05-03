import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter } from '../rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter['store'].clear()
  })

  describe('check', () => {
    it('allows first request', () => {
      const result = RateLimiter.check('test-user')

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('allows requests within limit', () => {
      for (let i = 0; i < 4; i++) {
        RateLimiter.check('test-user')
      }

      const result = RateLimiter.check('test-user')

      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
    })

    it('blocks requests after max attempts', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('test-user')
      }

      const result = RateLimiter.check('test-user')

      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
      expect(result.lockedUntil).toBeDefined()
    })

    it('tracks different identifiers independently', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('user-1')
      }

      const result = RateLimiter.check('user-2')

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('respects custom max attempts', () => {
      const result1 = RateLimiter.check('test-user', 3)
      expect(result1.remainingAttempts).toBe(2)

      const result2 = RateLimiter.check('test-user', 3)
      expect(result2.remainingAttempts).toBe(1)

      const result3 = RateLimiter.check('test-user', 3)
      expect(result3.allowed).toBe(false)
      expect(result3.remainingAttempts).toBe(0)
    })

    it('resets counter after window expires', () => {
      const shortWindow = 100
      RateLimiter.check('test-user', 5, shortWindow)

      const entry = RateLimiter['store'].get('test-user')!
      entry.resetTime = Date.now() - 1
      RateLimiter['store'].set('test-user', entry)

      const result = RateLimiter.check('test-user', 5, shortWindow)

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('maintains lockout even within window', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('test-user')
      }

      const result = RateLimiter.check('test-user')

      expect(result.allowed).toBe(false)
      expect(result.lockedUntil).toBeDefined()
    })
  })

  describe('reset', () => {
    it('resets rate limit for identifier', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('test-user')
      }

      RateLimiter.reset('test-user')

      const result = RateLimiter.check('test-user')

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('does not affect other identifiers', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('user-1')
      }
      RateLimiter.check('user-2')

      RateLimiter.reset('user-1')

      const result1 = RateLimiter.check('user-1')
      const result2 = RateLimiter.check('user-2')

      expect(result1.allowed).toBe(true)
      expect(result2.remainingAttempts).toBe(3)
    })
  })

  describe('cleanup', () => {
    it('removes expired entries', () => {
      RateLimiter.check('expired-user', 5, 100)

      const entry = RateLimiter['store'].get('expired-user')!
      entry.resetTime = Date.now() - 1000
      RateLimiter['store'].set('expired-user', entry)

      RateLimiter.cleanup()

      expect(RateLimiter['store'].has('expired-user')).toBe(false)
    })

    it('keeps active entries', () => {
      RateLimiter.check('active-user')

      RateLimiter.cleanup()

      expect(RateLimiter['store'].has('active-user')).toBe(true)
    })

    it('removes locked entries after lockout expires', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('locked-user')
      }

      const entry = RateLimiter['store'].get('locked-user')!
      entry.resetTime = Date.now() - 1000
      entry.lockedUntil = Date.now() - 1000
      RateLimiter['store'].set('locked-user', entry)

      RateLimiter.cleanup()

      expect(RateLimiter['store'].has('locked-user')).toBe(false)
    })

    it('keeps locked entries still in lockout period', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('locked-user')
      }

      const entry = RateLimiter['store'].get('locked-user')!
      entry.resetTime = Date.now() - 1000
      entry.lockedUntil = Date.now() + 60000
      RateLimiter['store'].set('locked-user', entry)

      RateLimiter.cleanup()

      expect(RateLimiter['store'].has('locked-user')).toBe(true)
    })
  })

  describe('getClientIp', () => {
    it('returns unknown when TRUST_PROXY is not set', () => {
      delete process.env.TRUST_PROXY

      const request = new Request('http://localhost:3000')
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('unknown')
    })

    it('returns unknown when TRUST_PROXY is false', () => {
      process.env.TRUST_PROXY = 'false'

      const request = new Request('http://localhost:3000')
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('unknown')
    })

    it('returns x-real-ip when TRUST_PROXY is true', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '192.168.1.1' },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('192.168.1.1')
    })

    it('returns last IP from x-forwarded-for', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: { 'x-forwarded-for': '10.0.0.1, 172.16.0.1, 192.168.1.1' },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('192.168.1.1')
    })

    it('returns cf-connecting-ip when other headers missing', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: { 'cf-connecting-ip': '104.16.0.1' },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('104.16.0.1')
    })

    it('returns unknown when no headers present', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000')
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('unknown')
    })
  })

  describe('getIdentifier', () => {
    it('combines username and ip', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '192.168.1.1' },
      })
      const identifier = RateLimiter.getIdentifier('admin', request)

      expect(identifier).toBe('admin:192.168.1.1')
    })

    it('uses unknown for ip when not available', () => {
      delete process.env.TRUST_PROXY

      const request = new Request('http://localhost:3000')
      const identifier = RateLimiter.getIdentifier('admin', request)

      expect(identifier).toBe('admin:unknown')
    })
  })

  describe('锁定机制边界条件', () => {
    it('锁定期间持续请求不延长锁定时间', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('test-user')
      }

      const firstLockResult = RateLimiter.check('test-user')
      const firstLockedUntil = firstLockResult.lockedUntil

      RateLimiter.check('test-user')
      RateLimiter.check('test-user')

      const entry = RateLimiter['store'].get('test-user')!
      expect(entry.lockedUntil).toBe(firstLockedUntil)
    })

    it('锁定过期后允许重新尝试', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('test-user')
      }

      const entry = RateLimiter['store'].get('test-user')!
      entry.lockedUntil = Date.now() - 1
      entry.resetTime = Date.now() - 1
      RateLimiter['store'].set('test-user', entry)

      const result = RateLimiter.check('test-user')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('窗口过期后重置计数但不重置锁定', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('test-user')
      }

      const entry = RateLimiter['store'].get('test-user')!
      entry.resetTime = Date.now() - 1
      entry.lockedUntil = Date.now() + 60000
      RateLimiter['store'].set('test-user', entry)

      const result = RateLimiter.check('test-user')
      expect(result.allowed).toBe(false)
      expect(result.lockedUntil).toBeDefined()
    })

    it('maxAttempts为1时第一次请求允许但第二次锁定', () => {
      const result1 = RateLimiter.check('strict-user', 1)
      expect(result1.allowed).toBe(true)
      expect(result1.remainingAttempts).toBe(0)

      const result2 = RateLimiter.check('strict-user', 1)
      expect(result2.allowed).toBe(false)
      expect(result2.lockedUntil).toBeDefined()
    })

    it('maxAttempts为0时第一次请求仍允许（边界行为）', () => {
      const result = RateLimiter.check('zero-user', 0)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(-1)
    })
  })

  describe('剩余尝试次数精确计算', () => {
    it('第1次尝试后剩余4次', () => {
      const result = RateLimiter.check('count-user')
      expect(result.remainingAttempts).toBe(4)
    })

    it('第2次尝试后剩余3次', () => {
      RateLimiter.check('count-user')
      const result = RateLimiter.check('count-user')
      expect(result.remainingAttempts).toBe(3)
    })

    it('第4次尝试后剩余1次', () => {
      for (let i = 0; i < 3; i++) {
        RateLimiter.check('count-user')
      }
      const result = RateLimiter.check('count-user')
      expect(result.remainingAttempts).toBe(1)
    })

    it('第5次尝试后剩余0次并锁定', () => {
      for (let i = 0; i < 4; i++) {
        RateLimiter.check('count-user')
      }
      const result = RateLimiter.check('count-user')
      expect(result.remainingAttempts).toBe(0)
      expect(result.allowed).toBe(false)
      expect(result.lockedUntil).toBeDefined()
    })
  })

  describe('reset边界条件', () => {
    it('reset不存在的标识符不报错', () => {
      expect(() => RateLimiter.reset('nonexistent')).not.toThrow()
    })

    it('reset后重新计数从1开始', () => {
      for (let i = 0; i < 3; i++) {
        RateLimiter.check('test-user')
      }

      RateLimiter.reset('test-user')

      const result = RateLimiter.check('test-user')
      expect(result.remainingAttempts).toBe(4)
    })
  })

  describe('cleanup边界条件', () => {
    it('空store时cleanup不报错', () => {
      expect(() => RateLimiter.cleanup()).not.toThrow()
    })

    it('cleanup同时处理多个过期条目', () => {
      RateLimiter.check('expired-1', 5, 100)
      RateLimiter.check('expired-2', 5, 100)
      RateLimiter.check('active-1')

      const entry1 = RateLimiter['store'].get('expired-1')!
      entry1.resetTime = Date.now() - 1000
      RateLimiter['store'].set('expired-1', entry1)

      const entry2 = RateLimiter['store'].get('expired-2')!
      entry2.resetTime = Date.now() - 1000
      RateLimiter['store'].set('expired-2', entry2)

      RateLimiter.cleanup()

      expect(RateLimiter['store'].has('expired-1')).toBe(false)
      expect(RateLimiter['store'].has('expired-2')).toBe(false)
      expect(RateLimiter['store'].has('active-1')).toBe(true)
    })
  })

  describe('getClientIp优先级', () => {
    it('x-forwarded-for优先于x-real-ip', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '10.0.0.1',
          'x-real-ip': '192.168.1.1',
        },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('10.0.0.1')
    })

    it('x-real-ip优先于cf-connecting-ip', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: {
          'x-real-ip': '192.168.1.1',
          'cf-connecting-ip': '104.16.0.1',
        },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('192.168.1.1')
    })

    it('TRUST_PROXY=1也启用代理信任', () => {
      process.env.TRUST_PROXY = '1'

      const request = new Request('http://localhost:3000', {
        headers: { 'x-real-ip': '192.168.1.1' },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('192.168.1.1')
    })

    it('x-forwarded-for包含多个IP时取最后一个', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('3.3.3.3')
    })

    it('x-forwarded-for单个IP时正确返回', () => {
      process.env.TRUST_PROXY = 'true'

      const request = new Request('http://localhost:3000', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      })
      const ip = RateLimiter.getClientIp(request)

      expect(ip).toBe('10.0.0.1')
    })
  })

  describe('多标识符并发场景', () => {
    it('不同用户名和IP组合独立计数', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('user-a:192.168.1.1')
      }

      const resultB = RateLimiter.check('user-b:192.168.1.1')
      expect(resultB.allowed).toBe(true)

      const resultA2 = RateLimiter.check('user-a:10.0.0.1')
      expect(resultA2.allowed).toBe(true)
    })

    it('同一用户名不同IP独立计数', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.check('admin:192.168.1.1')
      }

      const result = RateLimiter.check('admin:10.0.0.1')
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })
  })
})
