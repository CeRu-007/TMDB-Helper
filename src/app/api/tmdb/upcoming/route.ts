import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager } from '@/lib/data/server-config-manager';
import { fetchTmdbFeed } from '@/lib/tmdb/tmdb-feed';

// 统一使用共享模块获取 upcoming Feed，避免重复实现
export async function GET(request: NextRequest) {
  try {
    // 优先使用环境变量中的密钥,其次使用用户配置的密钥
    const apiKey = process.env.TMDB_API_KEY || ServerConfigManager.getConfig().tmdbApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'TMDB API密钥未配置' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const region = url.searchParams.get('region') || 'CN';
    const language = url.searchParams.get('language') || 'zh-CN';

    const result = await fetchTmdbFeed('upcoming', { region, language }, apiKey);
    return NextResponse.json(result);
  } catch (error: Error) {

    return NextResponse.json(
      { success: false, error: `获取TMDB即将上线内容失败: ${error.message}` },
      { status: 500 }
    );
  }
}