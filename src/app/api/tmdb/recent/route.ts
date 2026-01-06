import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager } from '@/lib/data/server-config-manager';
import { fetchTmdbFeed } from '@/lib/tmdb/tmdb-feed';

// 统一使用共享模块获取 recent Feed，避免重复实现
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

    const result = await fetchTmdbFeed('recent', { region, language }, apiKey);
    return NextResponse.json(result);
  } catch (error: any) {

    return NextResponse.json(
      { success: false, error: `获取TMDB近期开播内容失败: ${error.message}` },
      { status: 500 }
    );
  }
}