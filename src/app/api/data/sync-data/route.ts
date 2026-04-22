import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import type { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';

interface SyncItem {
  id: string;
  title: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    await ServerStorageManager.init();

    const items: TMDBItem[] = await ServerStorageManager.getItems();

    const itemVersions = items
      .map((item) => new Date(item.updatedAt).getTime())
      .filter((t) => !isNaN(t));

    const latestItemTime = itemVersions.length > 0 ? Math.max(...itemVersions) : 0;
    const version = latestItemTime;

    return NextResponse.json({
      success: true,
      items,
      version,
      timestamp: new Date().toISOString(),
      stats: {
        itemCount: items.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '获取同步数据失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { items, clientVersion } = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的数据格式',
        },
        { status: 400 },
      );
    }

    const validItems = items.filter(
      (item: SyncItem) => item && typeof item === 'object' && item.id && item.title,
    );

    const invalidItemCount = items.length - validItems.length;

    if (invalidItemCount > 0) {
      logger.warn(`[API] 发现无效数据: ${invalidItemCount}个无效项目`);
    }

    return NextResponse.json({
      success: true,
      message: '数据同步完成',
      processed: {
        validItems: validItems.length,
        invalidItems: invalidItemCount,
      },
      serverVersion: Date.now(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '处理同步数据失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
