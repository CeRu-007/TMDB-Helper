import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@/lib/server-storage';
import { readUserItems, migrateExistingData } from '@/lib/user-aware-storage';
import { getUserIdFromRequest } from '@/app/api/user/route';

// GET /api/storage/items - 获取所有项目（用户隔离）
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户身份信息', items: [] },
        { status: 400 }
      );
    }

    console.log(`[API] 获取用户 ${userId} 的项目数据`);

    // 首次访问时尝试迁移现有数据
    if (userId && !userId.startsWith('anonymous')) {
      try {
        migrateExistingData(userId);
      } catch (migrationError) {
        console.warn('数据迁移失败，但不影响正常功能:', migrationError);
      }
    }

    // 读取用户专属数据
    const items = readUserItems(userId);

    return NextResponse.json({
      items,
      userId,
      count: items.length
    }, { status: 200 });
  } catch (error) {
    console.error('获取项目失败:', error);
    return NextResponse.json(
      {
        error: '获取项目失败',
        details: error instanceof Error ? error.message : String(error),
        items: []
      },
      { status: 500 }
    );
  }
}