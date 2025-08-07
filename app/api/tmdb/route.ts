import { NextRequest, NextResponse } from 'next/server'
import { TMDBService } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const url = searchParams.get('url')
    const query = searchParams.get('query')
    const page = searchParams.get('page') || '1'
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    switch (action) {
      case 'getItemFromUrl': {
        if (!url) {
          return NextResponse.json({
            success: false,
            error: '缺少URL参数'
          }, { status: 400 })
        }

        const data = await TMDBService.getItemFromUrl(url, forceRefresh)
        return NextResponse.json({
          success: true,
          data
        })
      }

      case 'search': {
        if (!query) {
          return NextResponse.json({
            success: false,
            error: '缺少查询参数'
          }, { status: 400 })
        }

        const data = await TMDBService.search(query, parseInt(page))
        return NextResponse.json({
          success: true,
          data
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: '不支持的操作'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('TMDB API错误:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
