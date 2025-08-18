import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth-manager';

/**
 * GET /api/auth/verify - 验证用户认证状态
 */
export async function GET(request: NextRequest) {
  try {
    // 检查是否是桌面应用环境
    const userAgent = request.headers.get('user-agent') || '';
    const isElectron = userAgent.includes('Electron') ||
                      userAgent.includes('TMDB-Helper-Electron') ||
                      process.env.ELECTRON_BUILD === 'true';

    console.log('[Auth] User-Agent:', userAgent);
    console.log('[Auth] 是否为桌面应用:', isElectron);

    // 如果是桌面应用，直接返回认证成功
    if (isElectron) {
      console.log('[Auth] 桌面应用跳过认证检查');

      // 确保管理员用户存在
      if (!AuthManager.hasAdminUser()) {
        console.log('[Auth] 初始化管理员用户...');
        await AuthManager.initializeFromEnv();
      }

      const adminUser = AuthManager.getAdminUser();
      const response = NextResponse.json({
        success: true,
        user: {
          id: adminUser?.id || 'admin',
          username: adminUser?.username || 'admin',
          lastLoginAt: adminUser?.lastLoginAt || new Date().toISOString()
        },
        systemUserId: AuthManager.getSystemUserId(),
        isElectron: true
      });

      console.log('[Auth] 桌面应用认证成功');
      return response;
    }

    // 非桌面应用的正常认证流程
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
    console.error('[Auth] 认证验证失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
