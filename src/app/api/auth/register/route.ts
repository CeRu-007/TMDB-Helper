import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { authLogger } from '@/lib/utils/logger';
import { initializeSchema } from '@/lib/database/schema';
import { getDatabaseAsync } from '@/lib/database/connection';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await getDatabaseAsync();
    initializeSchema();

    const body = await request.json();
    const { username, password } = body;

    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const result = await AuthService.register(username.trim(), password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const user = await AuthService.validateLogin(username.trim(), password);
    if (!user) {
      return NextResponse.json(
        { success: true, message: '注册成功，请登录', needsLogin: true },
        { status: 200 }
      );
    }

    const token = AuthService.generateToken(user, false);
    const sessionDays = Math.max(user.sessionExpiryDays || 0, 15);
    const maxAge = sessionDays * 24 * 60 * 60;
    const isSecure = process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, lastLoginAt: user.lastLoginAt },
      message: '注册成功',
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge, path: '/',
    });

    return response;
  } catch (error) {
    authLogger.error('Registration failed', error);
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
