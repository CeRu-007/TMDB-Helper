import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { validatePassword } from '@/lib/auth/password-validator';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '当前密码和新密码不能为空' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    const success = await AuthService.changePassword(currentPassword, newPassword);

    if (success) {
      const isSecure = process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production' && process.env.ELECTRON_BUILD !== 'true';

      const response = NextResponse.json({
        success: true,
        message: '密码修改成功，请重新登录'
      });
      response.cookies.set('auth-token', '', {
        httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 0, path: '/'
      });
      return response;
    } else {
      return NextResponse.json(
        { success: false, error: '当前密码错误' },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error('修改密码失败', error)
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});
