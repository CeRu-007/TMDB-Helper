import { NextRequest, NextResponse } from 'next/server';
import { ServerUserManager } from '@/lib/server-user-manager';
import { AuthMiddleware } from '@/lib/auth-middleware';

/**
 * POST /api/user/sync - 同步用户数据
 */
export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const { userInfo, stats } = await request.json();
    
    // 验证数据格式
    if (!userInfo || !stats) {
      return NextResponse.json(
        { success: false, error: '缺少必要的用户数据' },
        { status: 400 }
      );
    }

    // 更新服务端用户数据
    const userData = ServerUserManager.getUserData();
    if (!userData) {
      return NextResponse.json(
        { success: false, error: '用户数据不存在' },
        { status: 404 }
      );
    }

    // 更新统计信息
    userData.stats = {
      ...userData.stats,
      ...stats
    };
    
    // 更新基本信息
    userData.displayName = userInfo.displayName || userData.displayName;
    userData.avatarUrl = userInfo.avatarUrl || userData.avatarUrl;
    userData.lastActiveAt = new Date().toISOString();

    const success = ServerUserManager.saveUserData(userData);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: '用户数据同步成功' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: '用户数据同步失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('用户数据同步失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
});