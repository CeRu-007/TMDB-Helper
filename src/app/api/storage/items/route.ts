import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

const ADMIN_USER_ID = 'user_admin_system'; // 固定的管理员用户ID

// GET /api/storage/items - 获取所有项目（管理员用户）
export async function GET(request: NextRequest) {
  try {
    // 直接从文件系统读取管理员的项目数据
    const items = ServerStorageManager.getItems();

    return NextResponse.json({
      items,
      userId: ADMIN_USER_ID,
      count: items.length
    }, { status: 200 });
  } catch (error) {
    logger.error('获取项目失败', error)
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        items: []
      },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}