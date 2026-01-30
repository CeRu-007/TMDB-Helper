import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/auth/change-password - 修改管理员密码
 */
export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 验证输入
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '当前密码和新密码不能为空' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '新密码长度至少为6位' },
        { status: 400 }
      );
    }

    // 修改密码
    const success = await AuthManager.changePassword(currentPassword, newPassword);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '密码修改成功'
      });
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
