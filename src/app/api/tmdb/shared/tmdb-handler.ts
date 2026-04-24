import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager } from '@/lib/data/server-config-manager';
import { fetchTmdbFeed } from '@/lib/tmdb/tmdb-feed';
import { TMDB_API_KEY_FALLBACK } from '@/lib/constants/constants';

type FeedType = 'recent' | 'upcoming';

const errorMessages = {
  recent: '获取TMDB近期开播内容失败',
  upcoming: '获取TMDB即将上线内容失败'
} as const;

function getStatusCodeFromError(error: Error): number {
  const message = error.message || '';
  if (message.includes('401')) return 401;
  if (message.includes('403')) return 403;
  if (message.includes('429')) return 429;
  if (message.includes('timeout') || message.includes('超时')) return 504;
  return 500;
}

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
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const statusCode = getStatusCodeFromError(err);
    
    // 根据错误类型返回不同的错误消息
    let userMessage = errorMessages[feedType];
    if (err.message.includes('401') || err.message.includes('403')) {
      userMessage = 'API密钥无效或已过期，请在设置中配置有效的TMDB API密钥';
    } else if (err.message.includes('429')) {
      userMessage = '请求过于频繁，请稍后再试';
    } else if (err.message.includes('timeout') || err.message.includes('超时')) {
      userMessage = '请求超时，请检查网络连接后重试';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: `${userMessage}: ${err.message}`,
        code: statusCode 
      },
      { status: statusCode }
    );
  }
}