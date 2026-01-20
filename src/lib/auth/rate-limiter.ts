/**
 * 速率限制器 - 防止暴力破解攻击
 */

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
  lockedUntil?: number;
}

export class RateLimiter {
  private static readonly DEFAULT_MAX_ATTEMPTS = 5;
  private static readonly DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15分钟
  private static readonly LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30分钟锁定

  private static store: Map<string, RateLimitEntry> = new Map();

  /**
   * 检查是否允许请求
   * @param identifier 标识符（通常是 IP 地址）
   * @param maxAttempts 最大尝试次数
   * @param windowMs 时间窗口（毫秒）
   * @returns { allowed: boolean, remainingAttempts: number, resetTime: number, lockedUntil?: number }
   */
  static check(
    identifier: string,
    maxAttempts: number = RateLimiter.DEFAULT_MAX_ATTEMPTS,
    windowMs: number = RateLimiter.DEFAULT_WINDOW_MS
  ): {
    allowed: boolean;
    remainingAttempts: number;
    resetTime: number;
    lockedUntil?: number;
  } {
    const now = Date.now();
    const entry = RateLimiter.store.get(identifier);

    // 如果没有记录，创建新记录
    if (!entry) {
      const newEntry: RateLimitEntry = {
        attempts: 1,
        resetTime: now + windowMs
      };
      RateLimiter.store.set(identifier, newEntry);
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        resetTime: newEntry.resetTime
      };
    }

    // 检查是否在锁定期
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime,
        lockedUntil: entry.lockedUntil
      };
    }

    // 检查是否超过时间窗口
    if (now > entry.resetTime) {
      // 重置计数器
      entry.attempts = 1;
      entry.resetTime = now + windowMs;
      delete entry.lockedUntil;
      RateLimiter.store.set(identifier, entry);
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        resetTime: entry.resetTime
      };
    }

    // 增加尝试次数
    entry.attempts += 1;

    // 检查是否超过最大尝试次数
    if (entry.attempts >= maxAttempts) {
      // 锁定账户
      entry.lockedUntil = now + RateLimiter.LOCKOUT_DURATION_MS;
      RateLimiter.store.set(identifier, entry);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime,
        lockedUntil: entry.lockedUntil
      };
    }

    RateLimiter.store.set(identifier, entry);
    return {
      allowed: true,
      remainingAttempts: maxAttempts - entry.attempts,
      resetTime: entry.resetTime
    };
  }

  /**
   * 重置指定标识符的速率限制
   * @param identifier 标识符
   */
  static reset(identifier: string): void {
    RateLimiter.store.delete(identifier);
  }

  /**
   * 清理过期的记录
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of RateLimiter.store.entries()) {
      if (now > entry.resetTime && (!entry.lockedUntil || now > entry.lockedUntil)) {
        RateLimiter.store.delete(key);
      }
    }
  }

  /**
   * 获取客户端 IP 地址
   * @param request Next.js 请求对象
   * @returns IP 地址字符串
   */
  static getClientIp(request: Request): string {
    // 尝试从各种请求头中获取真实 IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // x-forwarded-for 可能包含多个 IP，取第一个
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // 如果没有找到，返回默认值
    return 'unknown';
  }
}

// 定期清理过期记录（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    RateLimiter.cleanup();
  }, 5 * 60 * 1000);
}