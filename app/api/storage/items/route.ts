import { NextRequest, NextResponse } from 'next/server';
import { readItems } from '@/lib/server-storage';
import { readUserItems, migrateExistingData } from '@/lib/user-aware-storage';

const ADMIN_USER_ID = 'user_admin_system'; // 固定的管理员用户ID

// GET /api/storage/items - 获取所有项目（管理员用户）
export async function GET(request: NextRequest) {
  try {
    console.log(`[API] 获取管理员的项目数据`);

    // 首次访问时尝试迁移现有数据到admin用户
    try {
      migrateExistingData(ADMIN_USER_ID);
    } catch (migrationError) {
      console.warn('数据迁移失败，但不影响正常功能:', migrationError);
    }

    // 读取管理员的项目数据
    const items = readUserItems(ADMIN_USER_ID);

    return NextResponse.json({
      items,
      userId: ADMIN_USER_ID,
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