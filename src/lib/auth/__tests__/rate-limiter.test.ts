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
})
