import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { RateLimiter } from '@/lib/auth/rate-limiter';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { authLogger } from '@/lib/utils/logger';
import { getDatabaseAsync } from '@/lib/database/connection';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await getDatabaseAsync();

    const body = await request.json();
    const { username, password, rememberMe = false } = body;

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

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

    const user = await AuthService.validateLogin(username, password);
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

    RateLimiter.reset(identifier);

    const token = AuthService.generateToken(user, rememberMe);

    const sessionDays = Math.max(user.sessionExpiryDays || 0, 15);
    const maxAge = (rememberMe ? sessionDays * 2 : sessionDays) * 24 * 60 * 60;

    const isSecure = process.env.COOKIE_SECURE !== undefined
      ? (process.env.COOKIE_SECURE === 'true')
      : (process.env.NODE_ENV === 'production');

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
      secure: isSecure,
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
