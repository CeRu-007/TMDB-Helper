import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({
        success: false,
        error: '缺少头像URL参数'
      }, { status: 400 })
    }

    // 验证URL格式
    try {
      new URL(url)
    } catch {
      return NextResponse.json({
        success: false,
        error: '无效的URL格式'
      }, { status: 400 })
    }

    // 代理请求到目标URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: '头像获取失败'
      }, { status: response.status })
    }

    // 检查内容类型是否为图片
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: '目标URL不是有效的图片'
      }, { status: 400 })
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer()

    // 返回图片数据
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    console.error('头像代理错误:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
