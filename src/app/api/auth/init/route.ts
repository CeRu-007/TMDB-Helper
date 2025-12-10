import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from '@/lib/auth/auth-manager';

/**
 * GET /api/auth/init - 检查认证系统初始化状态
 */
export async function GET(request: NextRequest) {
  try {
    const hasAdmin = AuthManager.hasAdminUser();
    
    return NextResponse.json({
      success: true,
      initialized: hasAdmin,
      message: hasAdmin ? '认证系统已初始化' : '认证系统未初始化'
    });

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/init - 初始化认证系统
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否已经初始化
    if (AuthManager.hasAdminUser()) {
      return NextResponse.json(
        { success: false, error: '认证系统已经初始化' },
        { status: 400 }
      );
    }

    // 从环境变量或默认值初始化
    const success = await AuthManager.initializeFromEnv();
    
    if (success) {
      const adminUser = AuthManager.getAdminUser();
      return NextResponse.json({
        success: true,
        message: '认证系统初始化成功',
        user: adminUser
      });
    } else {
      return NextResponse.json(
        { success: false, error: '认证系统初始化失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
