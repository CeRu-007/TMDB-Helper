import { NextRequest, NextResponse } from 'next/server'
import CryptoJS from 'crypto-js'

const BILIBILI_API_URL = 'https://api.bilibili.com/pgc/app/timeline'
const APP_KEY = '1d8b6e7d45233436'
const APP_SECRET = '560c52ccd288fed045859ed18bffd973'

const BASE_PARAMS = {
  build: '8810200',
  c_locale: 'zh-Hans_CN',
  channel: 'bili',
  disable_rcmd: '0',
  filter_type: '0',
  is_new: '0',
  mobi_app: 'android',
  night_mode: '0',
  platform: 'android',
  s_locale: 'zh-Hans_CN',
  statistics: '{"appId":1,"platform":3,"version":"8.81.0","abtest":""}'
}

function generateSign(params: Record<string, string>): string {
  const filteredParams = { ...params }
  delete filteredParams.sign

  const sortedKeys = Object.keys(filteredParams).sort()
  const signString = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&')
  const signData = signString + APP_SECRET

  return CryptoJS.MD5(signData).toString()
}

async function fetchBilibiliSchedule(): Promise<Response> {
  const timestamp = (Date.now() / 1000).toFixed(0)
  const params = {
    ...BASE_PARAMS,
    appkey: APP_KEY,
    ts: timestamp
  }

  const sign = generateSign(params)

  const queryString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&') + `&sign=${sign}`

  const response = await fetch(`${BILIBILI_API_URL}?${queryString}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.bilibili.com/',
      'Origin': 'https://www.bilibili.com',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(`Bilibili API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (data.code !== 0) {
    throw new Error(`Bilibili API returned error: ${data.message}`)
  }

  return NextResponse.json(data)
}

export async function GET(request: NextRequest) {
  try {
    return await fetchBilibiliSchedule()
  } catch (error) {
    console.error('Error fetching Bilibili schedule:', error)
    return NextResponse.json(
      { code: -1, message: 'Failed to fetch schedule data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { code: -1, message: 'POST method not supported' },
    { status: 405 }
  )
}