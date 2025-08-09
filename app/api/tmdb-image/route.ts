import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const size = searchParams.get('size') || 'w500'
    
    if (!path) {
      return NextResponse.json({
        success: false,
        error: '缺少图片路径参数'
      }, { status: 400 })
    }

    // 构建TMDB图片URL
    const imageUrl = `https://image.tmdb.org/t/p/${size}${path}`
    
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

    // 返回图片数据
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 缓存24小时
        'Access-Control-Allow-Origin': '*',
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
