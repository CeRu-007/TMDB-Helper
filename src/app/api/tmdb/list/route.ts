import { NextRequest, NextResponse } from 'next/server';
import { TMDBService } from '@/lib/tmdb/tmdb';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ success: false, error: '缺少 listId 参数' }, { status: 400 });
    }

    const data = await TMDBService.getListItems(listId);

    if (!data) {
      return NextResponse.json(
        { success: false, error: '未找到该列表或获取失败' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('TMDB List API Error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 }
    );
  }
}
