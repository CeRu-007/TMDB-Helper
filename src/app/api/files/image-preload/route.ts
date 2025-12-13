import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json()
    
    // 简单返回成功响应，不再进行预加载
    return NextResponse.json({
      success: true,
      message: `Received ${urls?.length || 0} URLs`
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Image cache has been disabled' },
    { status: 404 }
  )
}