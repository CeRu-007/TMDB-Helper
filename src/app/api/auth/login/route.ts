import { NextRequest, NextResponse } from 'next/server';
import { AuthManager, LoginRequest } from '@/lib/auth/auth-manager';
import { RateLimiter } from '@/lib/auth/rate-limiter';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { authLogger } from '@/lib/utils/logger';

/**
 * POST /api/auth/login - 用户登录
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LoginRequest = await request.json();
    const { username, password, rememberMe = false } = body;

    // 验证输入（在速率限制检查之前，避免空输入也消耗尝试次数）
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 检查速率限制（使用用户名 + IP 组合作为标识符）
    const identifier = RateLimiter.getIdentifier(username, request);
    const rateLimitResult = RateLimiter.check(identifier);

    if (!rateLimitResult.allowed) {
      const lockedMinutes = Math.ceil(
        (rateLimitResult.lockedUntil! - Date.now()) / (60 * 1000)
      );
      return NextResponse.json(
        {
          success: false,
          error: '登录尝试次数过多，请稍后再试',
          lockedUntil: rateLimitResult.lockedUntil,
          lockedMinutes,
        },
        { status: 429 }
      );
    }

    // 验证登录
    const user = await AuthManager.validateLogin(username, password);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '用户名或密码错误',
          remainingAttempts: rateLimitResult.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 登录成功，重置速率限制
    RateLimiter.reset(identifier);

    // 生成JWT Token
    const token = AuthManager.generateToken(user, rememberMe);

    // 设置httpOnly cookie
    const sessionDays = Math.max(user.sessionExpiryDays || 0, 15);
    const maxAge = (rememberMe ? sessionDays * 2 : sessionDays) * 24 * 60 * 60;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        lastLoginAt: user.lastLoginAt,
      },
      message: '登录成功',
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    authLogger.error('Login failed', error);

    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
