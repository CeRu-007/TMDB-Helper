import { NextRequest, NextResponse } from 'next/server'
import { IqiyiApiClient } from '@/features/schedule/api/iqiyi-client'
import { IqiyiErrorResponse } from '@/features/schedule/api/iqiyi-constants'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const date = request.nextUrl.searchParams.get('date')

  if (!date) {
    const errorResponse: IqiyiErrorResponse = {
      code: -1,
      message: 'Missing required parameter: date'
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    const data = await IqiyiApiClient.fetchContent(date)
    return NextResponse.json(data)
  } catch (error) {
    const errorResponse: IqiyiErrorResponse = {
      code: -1,
      message: 'Failed to fetch Iqiyi content data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(): Promise<NextResponse> {
  const errorResponse: IqiyiErrorResponse = {
    code: -1,
    message: 'POST method not supported'
  }
  return NextResponse.json(errorResponse, { status: 405 })
}