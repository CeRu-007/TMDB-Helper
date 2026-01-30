import { NextRequest, NextResponse } from 'next/server';
// import { readUserItems } from '@/lib/user-aware-storage'; // 替换为StorageManager
import { StorageManager } from '@/lib/data/storage';
import { getUserIdFromRequest } from '@/lib/auth/user-utils';
import { TMDBItem } from '@/types/tmdb-item';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/items - 获取项目数据（专门用于数据一致性验证）
 * 支持 force=true 参数强制获取最新数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    logger.info(`[API] 获取项目数据请求 (force=${force})`);

    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: true,
          items: [],
          message: '缺少用户身份信息',
        },
        { status: 200 },
      );
    }

    // 获取用户的项目数据
    let items: TMDBItem[] = [];
    try {
      items = await StorageManager.getItemsWithRetry();
    } catch (error) {
      items = [];
    }

    // 添加时间戳用于缓存控制
    const response = NextResponse.json(
      {
        success: true,
        items,
        userId,
        timestamp: new Date().toISOString(),
        count: items.length,
      },
      { status: 200 },
    );

    // 如果是强制请求，设置不缓存的头部
    if (force) {
      response.headers.set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '获取项目数据失败',
        details: error instanceof Error ? error.message : String(error),
        items: [],
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/items - 批量操作项目数据
 */
export async function POST(request: NextRequest) {
  try {
    const { action, items } = await request.json();

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少操作类型',
        },
        { status: 400 },
      );
    }

    // 获取用户ID
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少用户身份信息',
        },
        { status: 401 },
      );
    }

    switch (action) {
      case 'validate_consistency':
        // 数据一致性验证
        try {
          const currentItems = await StorageManager.getItemsWithRetry();

          return NextResponse.json(
            {
              success: true,
              action,
              data: {
                currentItems,
                itemCount: currentItems.length,
                timestamp: new Date().toISOString(),
              },
            },
            { status: 200 },
          );
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: '数据一致性验证失败',
              details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
          );
        }

      case 'sync_check':
        // 同步检查
        try {
          const currentItems = await StorageManager.getItemsWithRetry();

          return NextResponse.json(
            {
              success: true,
              action,
              data: {
                items: currentItems,
                lastSync: new Date().toISOString(),
                syncStatus: 'up_to_date',
              },
            },
            { status: 200 },
          );
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: '同步检查失败',
              details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
          );
        }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `不支持的操作类型: ${action}`,
          },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '批量操作失败',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
