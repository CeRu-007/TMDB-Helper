import { NextResponse } from 'next/server'

// 使用你提供的有效参数直接调用B站API
const BILIBILI_API_URL = 'https://api.bilibili.com/pgc/app/timeline'

const PARAMS = 'appkey=1d8b6e7d45233436&build=8810200&c_locale=zh-Hans_CN&channel=bili&disable_rcmd=0&filter_type=0&is_new=0&mobi_app=android&night_mode=0&platform=android&s_locale=zh-Hans_CN&statistics=%7B%22appId%22%3A1%2C%22platform%22%3A3%2C%22version%22%3A%228.81.0%22%2C%22abtest%22%3A%22%22%7D&ts=1769871821&sign=adfd275bb75b7dd7d44b4b43b5e691ed'

export async function GET() {
  try {
    const response = await fetch(`${BILIBILI_API_URL}?${PARAMS}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.bilibili.com/',
        'Origin': 'https://www.bilibili.com',
        'Cache-Control': 'no-cache'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Bilibili API Error:', error)
    return NextResponse.json({
      code: -1,
      message: error instanceof Error ? error.message : 'Unknown error',
      result: { list: [] }
    })
  }
}