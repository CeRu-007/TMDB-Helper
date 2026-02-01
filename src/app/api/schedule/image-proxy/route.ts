import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = [
  'i0.hdslb.com',
  'i1.hdslb.com',
  'i2.hdslb.com',
  'static.hdslb.com',
  'archive.biliimg.com',
  'pic.bilibili.com',
  'i.328888.xyz',
  // 爱奇艺图片域名
  'pic0.iqiyipic.com',
  'pic1.iqiyipic.com',
  'pic2.iqiyipic.com',
  'pic3.iqiyipic.com',
  'pic4.iqiyipic.com',
  'pic5.iqiyipic.com',
  'pic6.iqiyipic.com',
  'pic7.iqiyipic.com',
  'pic8.iqiyipic.com',
  'pic9.iqiyipic.com',
  'iqiyipic.com',
]

function validateUrl(urlString: string): URL | null {
  try {
    const url = new URL(urlString)
    return url
  } catch {
    return null
  }
}

function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOSTS.some(host => url.hostname.includes(host))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 })
  }

  const decodedUrl = decodeURIComponent(imageUrl)
  const url = validateUrl(decodedUrl)

  if (!url) {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  if (!isAllowedHost(url)) {
    return NextResponse.redirect(decodedUrl)
  }

  try {
    // 根据图片来源设置正确的Referer
    const isIqiyiImage = url.hostname.includes('iqiyipic.com')
    const referer = isIqiyiImage ? 'https://www.iqiyi.com/' : 'https://www.bilibili.com/'

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/webp,image/avif,image/apng,image/*,*/*;q=0.8',
      },
      cache: 'force-cache',
    })

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
