import { NextRequest, NextResponse } from 'next/server';
// import { readItems } from '@/lib/server-storage';
// import { readUserItems, migrateExistingData } from '@/lib/user-aware-storage'; // 替换为StorageManager
import { StorageManager } from '@/lib/storage';

const ADMIN_USER_ID = 'user_admin_system'; // 固定的管理员用户ID

// GET /api/storage/items - 获取所有项目（管理员用户）
export async function GET(request: NextRequest) {
  try {
    // 读取管理员的项目数据
    const items = await StorageManager.getItemsWithRetry();

    return NextResponse.json({
      items,
      userId: ADMIN_USER_ID,
      count: items.length
    }, { status: 200 });
  } catch (error) {
    
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