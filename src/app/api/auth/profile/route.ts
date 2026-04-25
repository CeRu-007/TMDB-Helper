import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

export const GET = AuthMiddleware.withAuth(async (_request: NextRequest) => {
  try {
    const user = AuthService.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: user
    });

  } catch (error) {
    logger.error('获取管理员信息失败', error)
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});

export const PUT = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '用户名不能为空' },
        { status: 400 }
      );
    }

    const currentUser = AuthService.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '用户信息更新成功',
      user: {
        ...currentUser,
        username: username.trim()
      }
    });

  } catch (error) {
    logger.error('更新管理员信息失败', error)
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});
