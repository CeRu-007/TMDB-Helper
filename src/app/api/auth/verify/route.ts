import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';

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

    // 如果是桌面应用，直接返回认证成功
    if (isElectron) {
      // 同步初始化，避免异步等待
      if (!AuthManager.hasAdminUser()) {
        // 使用同步方式创建默认用户，避免异步等待
        try {
          require('fs').mkdirSync(require('path').join(process.cwd(), 'data', 'auth'), { recursive: true });
          const authFile = require('path').join(process.cwd(), 'data', 'auth', 'admin.json');
          if (!require('fs').existsSync(authFile)) {
            const defaultUser = {
              id: 'admin',
              username: 'admin',
              passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJw/2Ej7W', // admin
              createdAt: new Date().toISOString(),
              sessionExpiryDays: 15
            };
            require('fs').writeFileSync(authFile, JSON.stringify(defaultUser, null, 2));
          }
        } catch (error) {
          // 如果同步创建失败，继续使用空用户
        }
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
    
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
