import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

// GET /api/storage/check-duplicate?tmdbId=xxx&mediaType=xxx - 检查项目是否已存在
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');
    const mediaType = searchParams.get('mediaType');

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: '缺少必要参数: tmdbId 和 mediaType' },
        { status: 400 }
      );
    }

    // 确保数据库已初始化
    await ServerStorageManager.init();

    // 直接查询数据库，不加载关联数据
    const exists = await ServerStorageManager.checkDuplicateByTmdbId(tmdbId, mediaType);

    return NextResponse.json({ exists }, { status: 200 });
  } catch (error) {
    logger.error('检查重复项目失败', error);
    return NextResponse.json(
      { error: ErrorHandler.toUserMessage(error), exists: false },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
