import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';
import {
  UnauthorizedError,
  NotFoundError,
  ApplicationError,
  ErrorHandler,
} from '@/lib/utils/error-handler';
import { authLogger } from '@/lib/utils/logger';

/**
 * GET /api/auth/verify - 验证用户认证状态
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 获取 token
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      throw new UnauthorizedError('未找到认证信息');
    }

    // 验证token
    const decoded = AuthManager.verifyToken(token);
    if (!decoded) {
      throw new UnauthorizedError('认证信息无效');
    }

    // 获取用户信息
    const adminUser = AuthManager.getAdminUser();
    if (!adminUser) {
      throw new NotFoundError('用户');
    }

    return NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        lastLoginAt: adminUser.lastLoginAt,
      },
      systemUserId: AuthManager.getSystemUserId(),
    });
  } catch (error) {
    // 使用统一的错误处理
    if (error instanceof ApplicationError) {
      authLogger.error('Authentication verification failed', error);
      return NextResponse.json(
        {
          success: false,
          error: ErrorHandler.toUserMessage(error),
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    // 处理未知错误
    const err = error instanceof Error ? error : new Error(String(error));
    authLogger.error('Unexpected error during authentication verification', err);
    return NextResponse.json(
      {
        success: false,
        error: ErrorHandler.toUserMessage(err),
      },
      { status: ErrorHandler.getStatusCode(err) }
    );
  }
}
