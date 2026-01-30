import { NextRequest, NextResponse } from 'next/server'
import { TIMEOUT_10S, FILE_SIZE_5MB } from '@/lib/constants/constants'

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

    // 代理请求到目标URL，增加超时和重试机制
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: AbortSignal.timeout(TIMEOUT_10S) // 10秒超时
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: '头像获取失败'
      }, { status: response.status })
    }

    // 检查内容类型是否为图片
    const contentType = response.headers.get('content-type') || ''
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'
    ]

    if (!contentType.startsWith('image/') && !supportedTypes.some(type => contentType.includes(type))) {
      return NextResponse.json({
        success: false,
        error: '目标URL不是有效的图片格式'
      }, { status: 400 })
    }

    // 检查文件大小（限制为5MB）
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > FILE_SIZE_5MB) {
      return NextResponse.json({
        success: false,
        error: '图片文件过大，请使用小于5MB的图片'
      }, { status: 413 })
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer()

    // 再次检查实际大小
    if (imageBuffer.byteLength > FILE_SIZE_5MB) {
      return NextResponse.json({
        success: false,
        error: '图片文件过大，请使用小于5MB的图片'
      }, { status: 413 })
    }

    // 返回图片数据
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', // 缓存1小时，过期后1天内可使用旧版本
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'",
      }
    })

  } catch (error) {
    
    // 处理不同类型的错误
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return NextResponse.json({
          success: false,
          error: '请求超时，请检查网络连接或尝试其他图片URL'
        }, { status: 408 })
      }

      if (error.message.includes('fetch')) {
        return NextResponse.json({
          success: false,
          error: '无法访问该图片URL，请检查地址是否正确'
        }, { status: 502 })
      }
    }

    return NextResponse.json({
      success: false,
      error: '头像加载失败，请稍后重试'
    }, { status: 500 })
  }
}
