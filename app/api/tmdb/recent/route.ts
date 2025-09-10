import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager } from '@/lib/server-config-manager';
import { fetchTmdbFeed } from '@/lib/tmdb-feed';

// 统一使用共享模块获取 recent Feed，避免重复实现
export async function GET(request: NextRequest) {
  try {
    const config = ServerConfigManager.getConfig();
    const apiKey = config.tmdbApiKey;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'TMDB API密钥未配置，请在设置中配置并保存' },
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