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
    // 检查是否配置了可信代理
    const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';

    if (trustProxy) {
      // 仅在配置了可信代理时使用请求头
      const forwardedFor = request.headers.get('x-forwarded-for');
      if (forwardedFor) {
        // x-forwarded-for 可能包含多个 IP，取第一个（客户端IP）
        // 格式: clientIP, proxy1IP, proxy2IP
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[ips.length - 1]; // 取最后一个（最接近服务器的代理）
      }

      const realIp = request.headers.get('x-real-ip');
      if (realIp) {
        return realIp;
      }

      const cfConnectingIp = request.headers.get('cf-connecting-ip');
      if (cfConnectingIp) {
        return cfConnectingIp;
      }
    }

    // 如果没有配置可信代理或没有找到请求头，返回默认值
    // 注意：Next.js 的 Request 对象不直接提供 socket 信息
    // 在生产环境中，应该配置反向代理并设置 TRUST_PROXY=true
    return 'unknown';
  }

  /**
   * 生成速率限制标识符
   * 使用用户名 + IP 组合作为标识符，即使 IP 可伪造也能提供基本防护
   * @param username 用户名
   * @param request Next.js 请求对象
   * @returns 标识符字符串
   */
  static getIdentifier(username: string, request: Request): string {
    const ip = RateLimiter.getClientIp(request);
    // 使用用户名 + IP 组合，即使 IP 被伪造，攻击者也需要针对每个用户名单独尝试
    return `${username}:${ip}`;
  }
}

// 定期清理过期记录（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    RateLimiter.cleanup();
  }, 5 * 60 * 1000);
}