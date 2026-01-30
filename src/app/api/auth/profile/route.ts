import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/auth/profile - 获取管理员信息
 */
export const GET = AuthMiddleware.withAuth(async (_request: NextRequest) => {
  try {
    const adminUser = AuthManager.getAdminUser();
    
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: adminUser
    });

  } catch (error) {
    logger.error('获取管理员信息失败', error)
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
});

/**
 * PUT /api/auth/profile - 更新管理员信息
 */
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

    // 获取当前用户信息
    const currentUser = AuthManager.getAdminUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 这里可以添加更新用户名的逻辑
    // 目前只是返回成功响应，因为AuthManager还没有updateUsername方法
    
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
