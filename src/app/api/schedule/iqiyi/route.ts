import { NextResponse } from 'next/server'
import { IqiyiApiClient } from '@/features/schedule/api/iqiyi-client'
import { IqiyiErrorResponse } from '@/features/schedule/api/iqiyi-constants'

export async function GET(): Promise<NextResponse> {
  try {
    const data = await IqiyiApiClient.fetchTab()
    return NextResponse.json(data)
  } catch (error) {
    const errorResponse: IqiyiErrorResponse = {
      code: -1,
      message: 'Failed to fetch Iqiyi tab data',
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