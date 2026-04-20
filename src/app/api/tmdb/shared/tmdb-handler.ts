import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager } from '@/lib/data/server-config-manager';
import { fetchTmdbFeed } from '@/lib/tmdb/tmdb-feed';
import { TMDB_API_KEY_FALLBACK } from '@/lib/constants/constants';

type FeedType = 'recent' | 'upcoming';

const errorMessages = {
  recent: '获取TMDB近期开播内容失败',
  upcoming: '获取TMDB即将上线内容失败'
} as const;

export async function handleTmdbFeedRequest(
  request: NextRequest,
  feedType: FeedType
): Promise<NextResponse> {
  try {
    const apiKey = process.env.TMDB_API_KEY || TMDB_API_KEY_FALLBACK;

    const url = new URL(request.url);
    const region = url.searchParams.get('region') || 'CN';
    const language = url.searchParams.get('language') || 'zh-CN';

    const result = await fetchTmdbFeed(feedType, { region, language }, apiKey);
    return NextResponse.json(result);
  } catch (error: Error) {
    return NextResponse.json(
      { success: false, error: `${errorMessages[feedType]}: ${error.message}` },
      { status: 500 }
    );
  }
}