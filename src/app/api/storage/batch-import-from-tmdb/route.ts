import { NextRequest, NextResponse } from 'next/server';
import { ServerStorageManager } from '@/lib/data/server-storage-manager';
import { TMDBService } from '@/lib/tmdb/tmdb';
import { TMDBItem } from '@/types/tmdb-item';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface BatchImportItem {
  tmdbId: string;
  tmdbUrl: string;
  title: string;
}

export async function POST(request: NextRequest) {
  try {
    await ServerStorageManager.init();

    const body = await request.json();
    const items = body.items as BatchImportItem[];
    const batchLanguage = body.language || 'zh-CN';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的请求数据：缺少 items 数组' },
        { status: 400 }
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { success: false, error: '单次导入最多支持 50 个条目' },
        { status: 400 }
      );
    }

    const imported: TMDBItem[] = [];
    const skipped: { tmdbId: string; title: string; reason: string }[] = [];
    const errors: { tmdbId: string; title: string; error: string }[] = [];

    for (const item of items) {
      try {
        const tmdbData = await TMDBService.getItemFromUrl(item.tmdbUrl, false, batchLanguage);
        if (!tmdbData) {
          skipped.push({
            tmdbId: item.tmdbId,
            title: item.title,
            reason: '从 TMDB 获取详情失败',
          });
          continue;
        }

        const isDuplicate = await ServerStorageManager.checkDuplicateByTmdbId(item.tmdbId, 'tv');
        if (isDuplicate) {
          skipped.push({
            tmdbId: item.tmdbId,
            title: tmdbData.title,
            reason: '已存在',
          });
          continue;
        }

        const now = new Date().toISOString();
        const newItem: TMDBItem = {
          id: uuidv4(),
          title: tmdbData.title,
          originalTitle: undefined,
          mediaType: 'tv',
          tmdbId: tmdbData.tmdbId,
          tmdbUrl: item.tmdbUrl,
          posterUrl: tmdbData.posterUrl,
          posterPath: undefined,
          backdropUrl: tmdbData.backdropUrl,
          backdropPath: tmdbData.backdropPath ?? undefined,
          logoUrl: tmdbData.logoUrl,
          logoPath: tmdbData.logoPath ?? undefined,
          networkId: tmdbData.networkId,
          networkName: tmdbData.networkName,
          networkLogoUrl: tmdbData.networkLogoUrl,
          networks: tmdbData.networks?.map((n) => ({
            id: n.id,
            name: n.name,
            logoPath: n.logoPath,
            logoUrl: n.logoUrl,
          })),
          platformUrls: tmdbData.platformUrls,
          overview: tmdbData.overview ?? undefined,
          voteAverage: tmdbData.voteAverage ?? undefined,
          totalEpisodes: tmdbData.totalEpisodes,
          seasons: tmdbData.seasons?.map((s) => ({
            seasonNumber: s.seasonNumber,
            name: s.name,
            totalEpisodes: s.totalEpisodes,
            currentEpisode: 0,
            episodes: [],
          })),
          episodes: [],
          weekday: tmdbData.weekday,
          category: tmdbData.recommendedCategory || 'tv',
          status: 'ongoing',
          completed: false,
          isDailyUpdate: false,
          createdAt: now,
          updatedAt: now,
        };

        const result = await ServerStorageManager.addItem(newItem);
        if (result) {
          imported.push(newItem);
        } else {
          errors.push({
            tmdbId: item.tmdbId,
            title: tmdbData.title,
            error: '入库失败',
          });
        }
      } catch (error) {
        errors.push({
          tmdbId: item.tmdbId,
          title: item.title,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length,
        importedItems: imported,
        skippedItems: skipped,
        errorItems: errors,
      },
    });
  } catch (error) {
    logger.error('[BatchImport] 批量导入错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: ErrorHandler.toUserMessage(error),
      },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
