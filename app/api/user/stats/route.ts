import { NextRequest, NextResponse } from 'next/server';
import { ServerUserManager } from '@/lib/server-user-manager';
import { AuthMiddleware } from '@/lib/auth-middleware';

/**
 * GET /api/user/stats - 获取用户统计数据
 */
export const GET = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    // 获取用户统计数据
    const stats = ServerUserManager.getUserStats();
    
    if (!stats) {
      // 如果没有统计数据，初始化并返回默认数据
      const userData = ServerUserManager.initializeUserData();
      return NextResponse.json({
        success: true,
        data: userData.stats
      });
    }

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取用户统计失败:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/user/stats - 更新用户统计数据
 */
export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const { feature, usageTime } = await request.json();
    
    let success = true;
    
    if (feature) {
      success = success && ServerUserManager.recordFeatureUsage(feature);
    }
    
    if (usageTime && typeof usageTime === 'number') {
      success = success && ServerUserManager.updateUsageTime(usageTime);
    }
    
    if (success) {
      const updatedStats = ServerUserManager.getUserStats();
      return NextResponse.json({
        success: true,
        data: updatedStats,
        message: '统计数据更新成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '统计数据更新失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('更新用户统计失败:', error);
    return NextResponse.json(
      { success: false, error: '统计数据更新失败' },
      { status: 500 }
    );
  }
});