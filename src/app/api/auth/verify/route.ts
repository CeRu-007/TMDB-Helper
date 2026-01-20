import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';

/**
 * GET /api/auth/verify - 验证用户认证状态
 */
export async function GET(request: NextRequest) {
  try {
    // 获取 token
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未找到认证信息' },
        { status: 401 }
      );
    }

    // 验证token
    const decoded = AuthManager.verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: '认证信息无效' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const adminUser = AuthManager.getAdminUser();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        lastLoginAt: adminUser.lastLoginAt
      },
      systemUserId: AuthManager.getSystemUserId()
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
