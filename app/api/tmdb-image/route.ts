import { NextRequest, NextResponse } from 'next/server'
import { serverImageCache } from '@/lib/serverImageCache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const size = searchParams.get('size') || 'w500'
    const timestamp = searchParams.get('t') // 时间戳参数，用于强制刷新
    
    if (!path) {
      return NextResponse.json({
        success: false,
        error: '缺少图片路径参数'
      }, { status: 400 })
    }

    // 构建TMDB图片URL
    const imageUrl = `https://image.tmdb.org/t/p/${size}${path}`
    
    // 检查是否有时间戳参数，如果有则跳过缓存
    const useCache = !timestamp
    
    if (useCache) {
      // 检查服务器端缓存
      const cached = await serverImageCache.get(imageUrl)
      if (cached) {
        return new NextResponse(Buffer.from(cached.buffer, 'base64'), {
          headers: {
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400', // 缓存24小时，再验证1天
            'Access-Control-Allow-Origin': '*',
            'X-Cache': 'HIT',
          }
        })
      }
    }

    // 代理请求到TMDB
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: '图片获取失败'
      }, { status: response.status })
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // 缓存到服务器端缓存
    if (useCache) {
      try {
        await serverImageCache.set(imageUrl, Buffer.from(imageBuffer), contentType)
      } catch (cacheError) {
        console.warn('Failed to cache image:', cacheError)
      }
    }

    // 返回图片数据
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400', // 缓存24小时，再验证1天
        'Access-Control-Allow-Origin': '*',
        'X-Cache': useCache ? 'MISS' : 'BYPASS',
      }
    })

  } catch (error) {
    console.error('TMDB图片代理错误:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}