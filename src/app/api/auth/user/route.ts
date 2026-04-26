import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { AuthService } from '@/lib/auth/auth-service';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { userRepository } from '@/lib/database/repositories/auth.repository';

function buildUserInfo(user: { id: string; username: string; createdAt: string; lastLoginAt?: string; avatarUrl?: string } | null) {
  if (!user) {
    return {
      userId: 'anonymous',
      displayName: '匿名用户',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
  }
  return {
    userId: user.id,
    displayName: user.username,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    lastActiveAt: user.lastLoginAt || new Date().toISOString(),
  };
}

export const GET = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未找到用户ID' },
        { status: 400 }
      );
    }

    const user = AuthService.getUser();
    return NextResponse.json({
      success: true,
      user: buildUserInfo(user)
    });

  } catch (error) {
    logger.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});

export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { displayName, avatarUrl, userId: requestUserId } = body;

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未找到用户ID' },
        { status: 400 }
      );
    }

    if (requestUserId && requestUserId !== userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不匹配' },
        { status: 403 }
      );
    }

    logger.info(`在服务器端接收到用户信息更新请求: displayName=${displayName}, avatarUrl=${avatarUrl}`);

    if (typeof avatarUrl === 'string') {
      userRepository.updateAvatar(userId, avatarUrl);
    }

    const user = AuthService.getUser();
    return NextResponse.json({
      success: true,
      message: '用户信息更新成功',
      user: buildUserInfo(user ? { ...user, username: displayName || user.username } : null)
    });

  } catch (error) {
    logger.error('更新用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});

export const DELETE = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未找到用户ID' },
        { status: 400 }
      );
    }

    logger.info('服务器端：接收到清除用户数据请求');

    return NextResponse.json({
      success: true,
      message: '用户数据已重置'
    });

  } catch (error) {
    logger.error('重置用户数据失败:', error);
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});
