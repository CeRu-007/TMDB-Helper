// API TMDB Routes
// Handles TMDB-related API endpoints

import { NextRequest, NextResponse } from 'next/server';
import { TMDBService } from '@/lib/tmdb/tmdb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const url = searchParams.get('url');
    const query = searchParams.get('query');
    const page = searchParams.get('page') || '1';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log('[TMDB API] Request:', { action, url, query, page, forceRefresh });

    // Handle search action
    if (action === 'search' && query) {
      console.log('[TMDB API] Searching for:', query);
      const result = await TMDBService.search(query, parseInt(page));
      console.log('[TMDB API] Search result:', result);
      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // Handle getItemFromUrl action
    if (action === 'getItemFromUrl' && url) {
      console.log('[TMDB API] Getting item from URL:', url);
      const result = await TMDBService.getItemFromUrl(url, forceRefresh);
      console.log('[TMDB API] Item result:', result);

      if (!result) {
        return NextResponse.json({
          success: false,
          error: '未能从TMDB获取到有效数据'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    // If no action specified, return error
    return NextResponse.json({
      success: false,
      error: '缺少必要的参数或action'
    }, { status: 400 });

  } catch (error) {
    console.error('[TMDB API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }, { status: 500 });
  }
}