import { NextRequest, NextResponse } from 'next/server';
// import { migrateExistingData, getAllUsers, getUserStats } from '@/lib/user-aware-storage'; // 移除迁移功能
// 使用默认的StorageManager
import { getUserIdFromRequest } from '@/lib/user-utils';

/**
 * 数据迁移API
 * 处理从共享存储到用户隔离存储的迁移
 */

/**
 * POST /api/migrate-data - 执行数据迁移
 */
export async function POST(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户身份信息' },
        { status: 400 }
      );
    }

    const { action } = await request.json();

    // 移除了tmdb_items优化功能，现在使用自动紧凑格式保存

    // 执行迁移
    const migrated = migrateExistingData(userId);
    
    if (migrated) {
      // 获取迁移后的统计信息
      const stats = getUserStats(userId);
      
      return NextResponse.json({
        success: true,
        message: '数据迁移成功',
        userId,
        stats,
        migrated: true
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '没有需要迁移的数据',
        userId,
        migrated: false
      });
    }
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false,
        error: '数据迁移失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate-data - 获取迁移状态和统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户身份信息' },
        { status: 400 }
      );
    }

    // 统计功能已移除
    return NextResponse.json({
      success: true,
      userId,
      message: '数据统计功能已统一管理'
    });
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false,
        error: '获取迁移状态失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/migrate-data - 清理用户数据（仅用于测试）
 */
export async function DELETE(request: NextRequest) {
  try {
    // 仅在开发环境中允许
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: '此操作仅在开发环境中可用' },
        { status: 403 }
      );
    }

    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户身份信息' },
        { status: 400 }
      );
    }

    // 这里可以添加清理用户数据的逻辑
    // 目前只是返回成功响应
    
    return NextResponse.json({
      success: true,
      message: '用户数据清理完成',
      userId
    });
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false,
        error: '清理用户数据失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
