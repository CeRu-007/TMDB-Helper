import { NextRequest, NextResponse } from 'next/server';
import { TMDBService } from '@/lib/tmdb/tmdb';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const url = searchParams.get('url');
    const query = searchParams.get('query');
    const page = parseInt(searchParams.get('page') || '1');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    logger.info('TMDB API Request', { action, url, query, page, forceRefresh });

    switch (action) {
      case 'search':
        if (!query) {
          return NextResponse.json(
            { success: false, error: '缺少搜索关键词' },
            { status: 400 }
          );
        }
        const searchResult = await TMDBService.search(query, page);
        return NextResponse.json({ success: true, data: searchResult });

      case 'getItemFromUrl':
        if (!url) {
          return NextResponse.json(
            { success: false, error: '缺少URL参数' },
            { status: 400 }
          );
        }
        const itemResult = await TMDBService.getItemFromUrl(url, forceRefresh);
        if (!itemResult) {
          return NextResponse.json(
            { success: false, error: '未能从TMDB获取到有效数据' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: itemResult });

      default:
        return NextResponse.json(
          { success: false, error: '无效的action参数' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('TMDB API Error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
}