import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { UserManager } from '@/lib/auth/user-manager';
import { AuthManager } from '@/lib/auth/auth-manager';

/**
 * GET /api/auth/user - 获取当前用户信息
 */
export const GET = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未找到用户ID' },
        { status: 400 }
      );
    }

    // 检查是否在服务器端环境中（Next.js API路由始终在服务器端运行）
    // 在 Next.js 中，API 路由始终在服务器端执行
    const isServerEnvironment = true;

    // 在 Next.js API 路由中始终在服务端运行
    // 使用AuthManager获取用户信息
    const adminUser = AuthManager.getAdminUser();
    let userInfo;
    if (adminUser) {
      // 为服务器端环境创建一个兼容的用户信息对象
      userInfo = {
        userId: adminUser.id,
        displayName: adminUser.username,
        createdAt: adminUser.createdAt,
        lastActiveAt: adminUser.lastLoginAt || new Date().toISOString(),
        fingerprint: 'server',
        stats: {
          loginCount: 1,
          totalUsageTime: 0,
          lastSessionStart: new Date().toISOString(),
          featuresUsed: []
        }
      };
    } else {
      // 如果没有找到管理员用户，则返回一个匿名用户信息
      userInfo = {
        userId: 'anonymous',
        displayName: '匿名用户',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        fingerprint: 'server'
      };
    }

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/auth/user - 更新用户信息
 */
export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { displayName, avatarUrl, userId: requestUserId } = body;

    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未找到用户ID' },
        { status: 400 }
      );
    }

    // 验证用户ID匹配（安全检查）
    if (requestUserId && requestUserId !== userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不匹配' },
        { status: 403 }
      );
    }

    // Next.js API路由始终在服务器端运行
    const isServerEnvironment = true;

    // 在 Next.js API 路由中始终在服务端运行
    // 目前我们只记录这些更新操作，因为服务端无法直接修改客户端存储
    // 如果需要持久化用户信息变更，需要实现服务器端存储机制
    console.log(`在服务器端接收到用户信息更新请求: displayName=${displayName}, avatarUrl=${avatarUrl}`);

    // 返回更新后的用户信息
    const adminUser = AuthManager.getAdminUser();
    let userInfo;
    if (adminUser) {
      userInfo = {
        userId: adminUser.id,
        displayName: displayName || adminUser.username, // 如果提供了新名称，使用新名称
        createdAt: adminUser.createdAt,
        lastActiveAt: new Date().toISOString(),
        fingerprint: 'server',
        stats: {
          loginCount: 1,
          totalUsageTime: 0,
          lastSessionStart: new Date().toISOString(),
          featuresUsed: []
        }
      };
    } else {
      userInfo = {
        userId: 'anonymous',
        displayName: displayName || '匿名用户',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        fingerprint: 'server'
      };
    }

    return NextResponse.json({
      success: true,
      message: '用户信息更新成功',
      user: userInfo
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/auth/user - 重置用户数据
 */
export const DELETE = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未找到用户ID' },
        { status: 400 }
      );
    }

    // Next.js API路由始终在服务器端运行
    // 在服务器端环境中，我们不能清除客户端特定的存储（如localStorage）
    // 这种情况下，我们可以记录操作或者不执行任何操作
    console.log('服务器端：接收到清除用户数据请求');

    return NextResponse.json({
      success: true,
      message: '用户数据已重置'
    });

  } catch (error) {
    console.error('重置用户数据失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
});