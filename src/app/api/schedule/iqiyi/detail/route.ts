import { NextRequest, NextResponse } from 'next/server'
import { IqiyiApiClient } from '@/features/schedule/api/iqiyi-client'
import { IqiyiErrorResponse } from '@/features/schedule/api/iqiyi-constants'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const albumId = searchParams.get('albumId')

    if (!albumId) {
      const errorResponse: IqiyiErrorResponse = {
        code: -1,
        message: 'Missing required parameter: albumId'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const data = await IqiyiApiClient.fetchDetail(albumId)
    return NextResponse.json(data)
  } catch (error) {
    const errorResponse: IqiyiErrorResponse = {
      code: -1,
      message: 'Failed to fetch Iqiyi detail data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST() {
  const errorResponse: IqiyiErrorResponse = {
    code: -1,
    message: 'POST method not supported'
  }
  return NextResponse.json(errorResponse, { status: 405 })
}