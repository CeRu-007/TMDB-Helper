/**
 * 速率限制器 - 防止暴力破解攻击
 */

// Constants
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Types
interface RateLimitEntry {
  attempts: number;
  resetTime: number;
  lockedUntil?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  lockedUntil?: number;
}

// Rate Limiter Class
export class RateLimiter {
  private static store: Map<string, RateLimitEntry> = new Map();

  static check(
    identifier: string,
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    windowMs: number = DEFAULT_WINDOW_MS
  ): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // First attempt - create new entry
    if (!entry) {
      const newEntry: RateLimitEntry = {
        attempts: 1,
        resetTime: now + windowMs
      };
      this.store.set(identifier, newEntry);
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Check if still in lockout period
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime,
        lockedUntil: entry.lockedUntil
      };
    }

    // Check if window has expired - reset counter
    if (now > entry.resetTime) {
      entry.attempts = 1;
      entry.resetTime = now + windowMs;
      delete entry.lockedUntil;
      this.store.set(identifier, entry);
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        resetTime: entry.resetTime
      };
    }

    // Increment attempts
    entry.attempts += 1;

    // Check if limit exceeded - apply lockout
    if (entry.attempts >= maxAttempts) {
      entry.lockedUntil = now + LOCKOUT_DURATION_MS;
      this.store.set(identifier, entry);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime,
        lockedUntil: entry.lockedUntil
      };
    }

    this.store.set(identifier, entry);
    return {
      allowed: true,
      remainingAttempts: maxAttempts - entry.attempts,
      resetTime: entry.resetTime
    };
  }

  static reset(identifier: string): void {
    this.store.delete(identifier);
  }

  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime && (!entry.lockedUntil || now > entry.lockedUntil)) {
        this.store.delete(key);
      }
    }
  }

  static getClientIp(request: Request): string {
    const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';

    if (!trustProxy) {
      return 'unknown';
    }

    // Try different headers in order of preference
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip'
    ];

    for (const header of headers) {
      const value = request.headers.get(header);
      if (value) {
        if (header === 'x-forwarded-for') {
          // x-forwarded-for format: clientIP, proxy1IP, proxy2IP
          const ips = value.split(',').map(ip => ip.trim());
          return ips[ips.length - 1]; // Take the last IP (closest to server)
        }
        return value;
      }
    }

    return 'unknown';
  }

  static getIdentifier(username: string, request: Request): string {
    const ip = this.getClientIp(request);
    return `${username}:${ip}`;
  }
}

// Auto-cleanup expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    RateLimiter.cleanup();
  }, CLEANUP_INTERVAL_MS);
}