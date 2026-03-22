import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { getUserIdFromRequest } from '@/lib/auth/user-utils';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import type { TMDBItem } from '@/types/tmdb-item';

export async function POST(request: NextRequest) {
  try {
    await ServerStorageManager.init();

    const data = await request.json();
    const { items } = data;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        {
          error: '无效的导入数据',
          success: false,
        },
        { status: 400 },
      );
    }

    const userId = await getUserIdFromRequest(request);
    logger.info(
      `[API] 导入数据 - 用户ID: ${userId}, 项目数: ${items.length}`,
    );

    const validItems: TMDBItem[] = [];
    for (const item of items) {
      if (item && typeof item === 'object' && item.id && item.title && item.mediaType) {
        if (!item.createdAt) {
          item.createdAt = new Date().toISOString();
        }
        if (!item.updatedAt) {
          item.updatedAt = new Date().toISOString();
        }
        validItems.push(item as TMDBItem);
      }
    }

    const success = ServerStorageManager.importData(validItems);

    if (success) {
      logger.info(`[API] 导入成功: ${validItems.length} 个项目`);
    }

    return NextResponse.json(
      {
        success,
        stats: {
          itemsImported: validItems.length,
          itemsSkipped: items.length - validItems.length,
        },
        userId,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('导入数据失败', error)
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        success: false,
      },
      { status: ErrorHandler.getStatusCode(error) },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await ServerStorageManager.init();

    const userId = await getUserIdFromRequest(request);
    logger.info(`[API] 导出数据 - 用户ID: ${userId}`);

    const { items } = ServerStorageManager.exportData();

    return NextResponse.json(
      {
        items,
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        userId,
        stats: {
          itemCount: items.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('导出数据失败', error)
    return NextResponse.json(
      {
        error: ErrorHandler.toUserMessage(error),
        items: [],
      },
      { status: ErrorHandler.getStatusCode(error) },
    );
  }
}
