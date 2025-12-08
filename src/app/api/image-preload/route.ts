import { NextRequest, NextResponse } from 'next/server'
import { serverImageCache } from '@/lib/serverImageCache'

export async function POST(request: NextRequest) {
  try {
    const { urls, priority = 'normal' } = await request.json()

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'Missing or invalid urls array' },
        { status: 400 }
      )
    }

    // 验证URL格式
    const validUrls = urls.filter(url => {
      try {
        const parsedUrl = new URL(url)
        return parsedUrl.protocol.startsWith('http')
      } catch {
        return false
      }
    })

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      )
    }

    // 根据优先级设置不同的超时时间
    const timeout = priority === 'high' ? 30000 : 60000 // 30秒或60秒超时

    // 使用Promise.race实现超时控制
    const preloadPromise = serverImageCache.preloadBatch(validUrls)
    const timeoutPromise = new Promise<{ success: number; total: number }>((_, reject) => {
      setTimeout(() => reject(new Error('Preload timeout')), timeout)
    })

    const result = await Promise.race([preloadPromise, timeoutPromise])

    return NextResponse.json({
      success: true,
      result,
      message: `Preloaded ${result.success} of ${result.total} images`
    })

  } catch (error) {
    
    if (error instanceof Error && error.message === 'Preload timeout') {
      return NextResponse.json(
        { error: 'Preload operation timed out' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    )
  }

  try {
    // 检查图片是否在缓存中
    const cached = await serverImageCache.get(url)
    if (cached) {
      return new NextResponse(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=86400', // 24小时
        }
      })
    }

    // 如果不在缓存中，返回404
    return NextResponse.json(
      { error: 'Image not found in cache' },
      { status: 404 }
    )

  } catch (error) {
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}